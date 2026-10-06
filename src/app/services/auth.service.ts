import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { AuthResponse, DecodedToken, LoginRequest } from '../models/auth.models';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);

  private readonly TOKEN_KEY = 'auth_jwt_token';
  private timerInterval: any = null;    //  Holds the reference to JavaScript's setInterval()
                                        // This will hold the interval ID for the token expiry timer, allowing us to clear it when needed.

  // Reactive state signals
  readonly isLoggedIn = signal<boolean>(false);
  readonly currentUser = signal<{ username: string; role: string } | null>(null);
  readonly tokenRemainingSeconds = signal<number>(0);
  readonly showExpiryWarning = signal<boolean>(false);

  constructor() {
    this.restoreSession();      // when the tab is refreshed, restore the session if a valid token exists
                                // when page is refreshed, the state signals will be reset, so we need to restore them from the token if it exists
  }

  /**
   * Login with username and password
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.auth.login, credentials).pipe(
      tap((response) => {
        this.handleAuthenticationSuccess(response.token);
      })
    );
  }

  /**
   * Refreshes the existing token before it expires
   */
  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.auth.refresh, {}).pipe(
      tap((response) => {
        this.handleAuthenticationSuccess(response.token);
      })
    );
  }

  /**
   * Log out and clean up session
   */
  logout(reload: boolean = false): void {
    this.stopTokenTimer();
    this.storage.removeItem(this.TOKEN_KEY);
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.tokenRemainingSeconds.set(0);
    this.showExpiryWarning.set(false);

    if (reload) {
      // Per requirement: page is refreshed and directed to login page on expiration
      window.location.href = '/login';      // uses browser to reload the page and navigate to login, ensuring all state is reset
    } else {
      this.router.navigate(['/login']);     // uses Angular router to navigate to login without reloading the page, preserving the app state -> SPA.
    }
  }

  /**
   * Get raw token string
   */
  getToken(): string | null {
    return this.storage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if token is present and not expired
   */
  hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;

    console.log('Token expires at:', new Date(decoded.exp * 1000).toLocaleString());
    return decoded.exp * 1000 > Date.now();   // decode.exp will be in seconds and is of unix timestamp and not normal time, so multiply by 1000 to compare with Date.now() which is in milliseconds
  }

  private handleAuthenticationSuccess(token: string): void {
    this.storage.setItem(this.TOKEN_KEY, token);
    const decoded = this.decodeToken(token);

    if (decoded) {
      const username =
        decoded.unique_name ||
        decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
        decoded['name'] ||
        'User';

      const role =
        decoded.role ||
        decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        'User';

      this.currentUser.set({ username, role });
      this.isLoggedIn.set(true);
      this.showExpiryWarning.set(false);

      if (decoded.exp) {
        this.startTokenTimer(decoded.exp);
      }
    }
  }

  private restoreSession(): void {
    const token = this.getToken();
    if (token) {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
        const username =
          decoded.unique_name ||
          decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
          decoded['name'] ||
          'User';

        const role =
          decoded.role ||
          decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
          'User';

        this.currentUser.set({ username, role });
        this.isLoggedIn.set(true);
        this.startTokenTimer(decoded.exp);
      } else {
        this.logout(false);
      }
    }
  }

  private startTokenTimer(expSeconds: number): void {
    this.stopTokenTimer();

    const checkExpiry = () => {
      const remaining = Math.floor((expSeconds * 1000 - Date.now()) / 1000);

      if (remaining > 0) {
        this.tokenRemainingSeconds.set(remaining);
        // Requirement: when below 20s remaining, show warning
        if (remaining <= 20) {
          this.showExpiryWarning.set(true);
        } else {
          this.showExpiryWarning.set(false);
        }
      } else {
        // Expired!
        this.tokenRemainingSeconds.set(0);
        this.showExpiryWarning.set(false);
        this.stopTokenTimer();
        alert('Your session has expired. You are being redirected to the login page.');
        this.logout(true);
      }
    };

    checkExpiry();
    this.timerInterval = setInterval(checkExpiry, 1000);
  }

  private stopTokenTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private decodeToken(token: string): DecodedToken | null {
    try {
      const payloadBase64 = token.split('.')[1];        
      if (!payloadBase64) return null;
      const json = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch (e) {
      console.error('Failed to decode token', e);
      return null;
    }
  }
}
