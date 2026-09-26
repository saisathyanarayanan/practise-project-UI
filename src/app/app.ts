import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestApiService } from './services/test-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('UI');

  private readonly testApi = inject(TestApiService);

  protected readonly apiResult = signal('Not called yet');
  protected readonly apiError = signal('');

  protected loadMethodOne(): void {
    this.apiError.set('');
    this.testApi.getMethodOne().subscribe({
      next: (value) => this.apiResult.set(value),
      error: (err: HttpErrorResponse) => {
        this.apiError.set(`${err.status || 'network'} — ${err.message}`);
      }
    });
  }
}
