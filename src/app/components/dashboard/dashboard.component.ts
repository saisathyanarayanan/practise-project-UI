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

  testPrimaryApi(): void {
    this.apiStatus.set('loading');
    this.apiResponse.set('Requesting Primary API via Gateway: http://localhost:7231/api/Department/test ...');

    this.testApi.getDepartmentTest().subscribe({
      next: (res) => {
        this.apiStatus.set('success');
        this.apiResponse.set(`✅ [Gateway 7231 ➔ Primary API 5012]:\n` + JSON.stringify(res, null, 2));
      },
      error: (err: HttpErrorResponse) => {
        this.apiStatus.set('error');
        this.apiResponse.set(`❌ Gateway Error (${err.status}): ${err.message}`);
      }
    });
  }

  testTimeOfficeStatus(): void {
    this.apiStatus.set('loading');
    this.apiResponse.set('Requesting TimeOffice via Gateway: http://localhost:7231/api/timeoffice/status ...');

    this.testApi.getTimeOfficeStatus().subscribe({
      next: (res) => {
        this.apiStatus.set('success');
        this.apiResponse.set(`✅ [Gateway 7231 ➔ TimeOffice API 7014]:\n` + JSON.stringify(res, null, 2));
      },
      error: (err: HttpErrorResponse) => {
        this.apiStatus.set('error');
        this.apiResponse.set(`❌ Gateway Error (${err.status}): ${err.message}`);
      }
    });
  }

  testTimeOfficeAttendance(): void {
    this.apiStatus.set('loading');
    this.apiResponse.set('Requesting Attendance via Gateway: http://localhost:7231/api/timeoffice ...');

    this.testApi.getTimeOfficeAttendance().subscribe({
      next: (res) => {
        this.apiStatus.set('success');
        this.apiResponse.set(`✅ [Gateway 7231 ➔ TimeOffice API 7014 (Attendance Data)]:\n` + JSON.stringify(res, null, 2));
      },
      error: (err: HttpErrorResponse) => {
        this.apiStatus.set('error');
        this.apiResponse.set(`❌ Gateway Error (${err.status}): ${err.message}`);
      }
    });
  }

  testEmployeesLinq(dept?: string): void {
    this.apiStatus.set('loading');
    const filterInfo = dept ? ` (Filtered by LINQ: Department='${dept}')` : ' (All Employees via LINQ OrderBy)';
    this.apiResponse.set(`Requesting EF Core LINQ Query via Gateway: http://localhost:7231/api/Employee${dept ? '?department=' + dept : ''} ...`);

    this.testApi.getEmployees(dept).subscribe({
      next: (res) => {
        this.apiStatus.set('success');
        this.apiResponse.set(`✅ [Gateway 7231 ➔ EF Core LINQ${filterInfo}]:\n` + JSON.stringify(res, null, 2));
      },
      error: (err: HttpErrorResponse) => {
        this.apiStatus.set('error');
        this.apiResponse.set(`❌ Error (${err.status}): ${err.message}`);
      }
    });
  }

  testEmployeeSummary(): void {
    this.apiStatus.set('loading');
    this.apiResponse.set('Requesting LINQ GroupBy & Average Salary via Gateway: http://localhost:7231/api/Employee/summary ...');

    this.testApi.getEmployeeSummary().subscribe({
      next: (res) => {
        this.apiStatus.set('success');
        this.apiResponse.set(`✅ [Gateway 7231 ➔ LINQ GroupBy & Aggregations]:\n` + JSON.stringify(res, null, 2));
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
