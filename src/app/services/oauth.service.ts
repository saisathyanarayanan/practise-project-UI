import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap, from, switchMap, of, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import {
  OAuthTokenResponse,
  OAuthUserInfo,
  OAuthIntrospectResponse,
  OpenIdDiscoveryDocument,
  PkcePair
} from '../models/oauth.models';

@Injectable({ providedIn: 'root' })
export class OAuthService {
  private readonly http = inject(HttpClient);

  // Storage Keys
  private readonly ACCESS_TOKEN_KEY = 'oauth_access_token';
  private readonly REFRESH_TOKEN_KEY = 'oauth_refresh_token';
  private readonly ID_TOKEN_KEY = 'oauth_id_token';
  private readonly PKCE_VERIFIER_KEY = 'oauth_pkce_verifier';
  private readonly PKCE_STATE_KEY = 'oauth_pkce_state';

  // Reactive signals for modern Angular reactivity
  readonly accessToken = signal<string | null>(sessionStorage.getItem(this.ACCESS_TOKEN_KEY));
  readonly refreshToken = signal<string | null>(sessionStorage.getItem(this.REFRESH_TOKEN_KEY));
  readonly idToken = signal<string | null>(sessionStorage.getItem(this.ID_TOKEN_KEY));
  readonly decodedIdToken = signal<any | null>(null);
  readonly userInfo = signal<OAuthUserInfo | null>(null);
  readonly isAuthenticated = signal<boolean>(!!sessionStorage.getItem(this.ACCESS_TOKEN_KEY));

  constructor() {
    const savedIdToken = sessionStorage.getItem(this.ID_TOKEN_KEY);
    if (savedIdToken) {
      this.decodedIdToken.set(this.decodeJwt(savedIdToken));
    }
  }

  /**
   * Cryptographically generates PKCE Code Verifier, S256 Code Challenge, and State (RFC 7636)
   */
  async generatePkcePair(): Promise<PkcePair> {
    const verifier = this.generateRandomString(64);
    const challenge = await this.computeS256Challenge(verifier);
    const state = this.generateRandomString(32);

    sessionStorage.setItem(this.PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(this.PKCE_STATE_KEY, state);

    return {
      verifier,
      challenge,
      method: 'S256',
      state
    };
  }

  /**
   * Full Enterprise PKCE Authorization Code Flow in a single coordinated operation:
   * 1. Generates PKCE Verifier + S256 Challenge.
   * 2. Authorizes against /oauth/authorize using user credentials and PKCE challenge.
   * 3. Exchanges authorization code for Access Token, ID Token, and Refresh Token using code_verifier.
   */
  executePkceFlow(username: string, password: string, clientId: string = 'angular-spa-client'): Observable<OAuthTokenResponse> {
    return from(this.generatePkcePair()).pipe(
      switchMap((pkce) => {
        const authorizePayload = {
          response_type: 'code',
          client_id: clientId,
          redirect_uri: 'http://localhost:4200/oauth/callback',
          scope: 'openid profile email api.read api.write offline_access',
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
          state: pkce.state,
          username,
          password
        };

        return this.http.post<{ code: string; state: string; redirect_uri: string }>(
          API_ENDPOINTS.oauth.authorize,
          authorizePayload
        ).pipe(
          switchMap((authRes) => {
            if (!authRes.code) {
              return throwError(() => new Error('Authorization code was not issued.'));
            }

            // Step 3: Token Exchange with PKCE verification
            const tokenPayload = new HttpParams()
              .set('grant_type', 'authorization_code')
              .set('client_id', clientId)
              .set('code', authRes.code)
              .set('redirect_uri', 'http://localhost:4200/oauth/callback')
              .set('code_verifier', pkce.verifier);

            const headers = new HttpHeaders({
              'Content-Type': 'application/x-www-form-urlencoded'
            });

            return this.http.post<OAuthTokenResponse>(
              API_ENDPOINTS.oauth.token,
              tokenPayload.toString(),
              { headers }
            ).pipe(
              tap((tokenRes) => this.handleTokenSuccess(tokenRes))
            );
          })
        );
      })
    );
  }

  /**
   * Refresh Token Grant with Token Rotation (RFC 6749)
   */
  refreshAccessToken(clientId: string = 'angular-spa-client'): Observable<OAuthTokenResponse> {
    const currentRefresh = this.refreshToken();
    if (!currentRefresh) {
      return throwError(() => new Error('No refresh token available in active session.'));
    }

    const payload = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('client_id', clientId)
      .set('refresh_token', currentRefresh);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<OAuthTokenResponse>(
      API_ENDPOINTS.oauth.token,
      payload.toString(),
      { headers }
    ).pipe(
      tap((tokenRes) => this.handleTokenSuccess(tokenRes))
    );
  }

  /**
   * Machine-to-Machine Client Credentials Flow (RFC 6749)
   */
  executeClientCredentialsFlow(
    clientId: string = 'm2m-service-client',
    clientSecret: string = 'secret-enterprise-m2m-token-key-2026',
    scope: string = 'api.read api.write'
  ): Observable<OAuthTokenResponse> {
    const payload = new HttpParams()
      .set('grant_type', 'client_credentials')
      .set('client_id', clientId)
      .set('client_secret', clientSecret)
      .set('scope', scope);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<OAuthTokenResponse>(
      API_ENDPOINTS.oauth.token,
      payload.toString(),
      { headers }
    );
  }

  /**
   * Token Revocation Endpoint (RFC 7009)
   */
  revokeActiveToken(clientId: string = 'angular-spa-client'): Observable<void> {
    const token = this.refreshToken() || this.accessToken();
    if (!token) {
      this.clearLocalTokens();
      return of(void 0);
    }

    const payload = new HttpParams()
      .set('token', token)
      .set('token_type_hint', this.refreshToken() ? 'refresh_token' : 'access_token')
      .set('client_id', clientId);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<void>(API_ENDPOINTS.oauth.revoke, payload.toString(), { headers }).pipe(
      tap(() => this.clearLocalTokens())
    );
  }

  /**
   * Token Introspection Endpoint (RFC 7662)
   */
  introspectToken(tokenToInspect: string): Observable<OAuthIntrospectResponse> {
    const payload = new HttpParams().set('token', tokenToInspect);
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<OAuthIntrospectResponse>(
      API_ENDPOINTS.oauth.introspect,
      payload.toString(),
      { headers }
    );
  }

  /**
   * UserInfo Endpoint (OIDC Core 1.0)
   */
  fetchUserInfo(): Observable<OAuthUserInfo> {
    const token = this.accessToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<OAuthUserInfo>(API_ENDPOINTS.oauth.userinfo, { headers }).pipe(
      tap((info) => this.userInfo.set(info))
    );
  }

  /**
   * OpenID Connect Discovery Metadata
   */
  fetchDiscoveryDocument(): Observable<OpenIdDiscoveryDocument> {
    return this.http.get<OpenIdDiscoveryDocument>(API_ENDPOINTS.oauth.discovery);
  }

  /**
   * Decodes Base64Url JWT token payload without third-party dependencies
   */
  decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private handleTokenSuccess(response: OAuthTokenResponse): void {
    if (response.access_token) {
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
      this.accessToken.set(response.access_token);
      this.isAuthenticated.set(true);
    }

    if (response.refresh_token) {
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
      this.refreshToken.set(response.refresh_token);
    }

    if (response.id_token) {
      sessionStorage.setItem(this.ID_TOKEN_KEY, response.id_token);
      this.idToken.set(response.id_token);
      this.decodedIdToken.set(this.decodeJwt(response.id_token));
    }
  }

  private clearLocalTokens(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.ID_TOKEN_KEY);
    sessionStorage.removeItem(this.PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(this.PKCE_STATE_KEY);

    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.idToken.set(null);
    this.decodedIdToken.set(null);
    this.userInfo.set(null);
    this.isAuthenticated.set(false);
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  }

  private async computeS256Challenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
