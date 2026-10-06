import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { TestApiService } from '../../services/test-api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: false
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
  private readonly testApi = inject(TestApiService);

  apiResponse = signal<string>('No API calls made yet.');
  apiStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  refreshMessage = signal<string>('');

  callMethodOne(): void {
    this.apiStatus.set('loading');
    this.apiResponse.set('Requesting /api/test/method-one with JWT Bearer token...');

    this.testApi.getMethodOne().subscribe({
      next: (res) => {
        this.apiStatus.set('success');
        this.apiResponse.set(`✅ Response from API: "${res}"`);
      },
      error: (err: HttpErrorResponse) => {
        this.apiStatus.set('error');
        this.apiResponse.set(`❌ Error (${err.status}): ${err.message}`);
      }
    });
  }

  callMethodTwo(): void {
    this.apiStatus.set('loading');
    this.apiResponse.set('Requesting /api/test/method-two with JWT Bearer token...');

    this.testApi.getMethodTwo().subscribe({
      next: (res) => {
        this.apiStatus.set('success');
        this.apiResponse.set(`✅ Response from API: "${res}"`);
      },
      error: (err: HttpErrorResponse) => {
        this.apiStatus.set('error');
        this.apiResponse.set(`❌ Error (${err.status}): ${err.message}`);
      }
    });
  }

  manualRefreshToken(): void {
    this.refreshMessage.set('Refreshing token...');
    this.authService.refreshToken().subscribe({
      next: () => {
        this.refreshMessage.set('✅ Token refreshed successfully! Expiry extended.');
        setTimeout(() => this.refreshMessage.set(''), 4000);
      },
      error: (err) => {
        this.refreshMessage.set(`❌ Refresh failed: ${err.message}`);
      }
    });
  }

  logout(): void {
    this.authService.logout(false);
  }
}
