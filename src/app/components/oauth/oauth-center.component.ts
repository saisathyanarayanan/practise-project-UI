import { Component, inject, signal, OnInit } from '@angular/core';
import { OAuthService } from '../../services/oauth.service';
import { PkcePair, OAuthTokenResponse, OAuthUserInfo, OAuthIntrospectResponse, OpenIdDiscoveryDocument } from '../../models/oauth.models';

@Component({
  selector: 'app-oauth-center',
  templateUrl: './oauth-center.component.html',
  styleUrls: ['./oauth-center.component.scss'],
  standalone: false
})
export class OAuthCenterComponent implements OnInit {
  protected readonly oauthService = inject(OAuthService);

  // Flow Inputs
  username = signal<string>('admin');
  password = signal<string>('admin123');
  clientId = signal<string>('angular-spa-client');
  m2mClientId = signal<string>('m2m-service-client');
  m2mSecret = signal<string>('secret-enterprise-m2m-token-key-2026');

  // Interactive Live State
  pkcePair = signal<PkcePair | null>(null);
  tokenResponse = signal<OAuthTokenResponse | null>(null);
  userInfoData = signal<OAuthUserInfo | null>(null);
  introspectData = signal<OAuthIntrospectResponse | null>(null);
  discoveryDoc = signal<OpenIdDiscoveryDocument | null>(null);
  m2mTokenResponse = signal<OAuthTokenResponse | null>(null);

  // Status & Logs
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  activeTab = signal<'pkce' | 'tokens' | 'userinfo' | 'introspect' | 'm2m' | 'discovery'>('pkce');

  async ngOnInit(): Promise<void> {
    await this.generateNewPkce();
  }

  async generateNewPkce(): Promise<void> {
    try {
      const pair = await this.oauthService.generatePkcePair();
      this.pkcePair.set(pair);
      this.successMessage.set('Cryptographically secure PKCE Verifier & S256 Challenge generated.');
      setTimeout(() => this.successMessage.set(null), 4000);
    } catch (err: any) {
      this.errorMessage.set('PKCE Generation error: ' + err.message);
    }
  }

  runPkceAuthorizationFlow(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.oauthService.executePkceFlow(
      this.username(),
      this.password(),
      this.clientId()
    ).subscribe({
      next: (tokens) => {
        this.tokenResponse.set(tokens);
        this.successMessage.set('✅ PKCE Authorization Code flow succeeded! Access, ID, and Refresh tokens issued.');
        this.loading.set(false);
        this.activeTab.set('tokens');
      },
      error: (err) => {
        const errorMsg = err.error?.error_description || err.error?.error || err.message || 'Authorization failed';
        this.errorMessage.set('❌ OAuth Flow Failed: ' + errorMsg);
        this.loading.set(false);
      }
    });
  }

  rotateRefreshToken(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.oauthService.refreshAccessToken(this.clientId()).subscribe({
      next: (newTokens) => {
        this.tokenResponse.set(newTokens);
        this.successMessage.set('🔄 Token Rotation Complete! Old refresh token invalidated; new rotated pair active.');
        this.loading.set(false);
      },
      error: (err) => {
        const errorMsg = err.error?.error_description || err.message;
        this.errorMessage.set('Token Refresh failed: ' + errorMsg);
        this.loading.set(false);
      }
    });
  }

  fetchUserInfo(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthService.fetchUserInfo().subscribe({
      next: (info) => {
        this.userInfoData.set(info);
        this.loading.set(false);
        this.activeTab.set('userinfo');
      },
      error: (err) => {
        this.errorMessage.set('Failed to fetch UserInfo: ' + (err.error?.message || err.message));
        this.loading.set(false);
      }
    });
  }

  introspectCurrentToken(): void {
    const token = this.oauthService.accessToken() || this.oauthService.refreshToken();
    if (!token) {
      this.errorMessage.set('No active token to introspect.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthService.introspectToken(token).subscribe({
      next: (data) => {
        this.introspectData.set(data);
        this.loading.set(false);
        this.activeTab.set('introspect');
      },
      error: (err) => {
        this.errorMessage.set('Introspection failed: ' + err.message);
        this.loading.set(false);
      }
    });
  }

  revokeTokens(): void {
    this.loading.set(true);
    this.oauthService.revokeActiveToken(this.clientId()).subscribe({
      next: () => {
        this.tokenResponse.set(null);
        this.userInfoData.set(null);
        this.introspectData.set(null);
        this.loading.set(false);
        this.successMessage.set('⛔ Token successfully revoked via RFC 7009 endpoint and session cleared.');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.errorMessage.set('Revocation error: ' + err.message);
        this.loading.set(false);
      }
    });
  }

  runM2MClientCredentialsFlow(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthService.executeClientCredentialsFlow(
      this.m2mClientId(),
      this.m2mSecret()
    ).subscribe({
      next: (res) => {
        this.m2mTokenResponse.set(res);
        this.loading.set(false);
        this.activeTab.set('m2m');
        this.successMessage.set('🤖 Machine-to-Machine Client Credentials access token acquired!');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.errorMessage.set('M2M Flow error: ' + (err.error?.error_description || err.message));
        this.loading.set(false);
      }
    });
  }

  loadDiscoveryDocument(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthService.fetchDiscoveryDocument().subscribe({
      next: (doc) => {
        this.discoveryDoc.set(doc);
        this.loading.set(false);
        this.activeTab.set('discovery');
      },
      error: (err) => {
        this.errorMessage.set('Failed to load OIDC discovery: ' + err.message);
        this.loading.set(false);
      }
    });
  }
}
