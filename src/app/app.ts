import { Component, inject, signal } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App {
  readonly authService = inject(AuthService);
  readonly isRefreshing = signal<boolean>(false);

  extendSession(): void {
    this.isRefreshing.set(true);
    this.authService.refreshToken().subscribe({
      next: () => {
        this.isRefreshing.set(false);
        console.log('Session extended successfully for another 30 minutes.');
      },
      error: (err) => {
        this.isRefreshing.set(false);
        console.error('Failed to extend session', err);
      }
    });
  }

  dismissAndLogout(): void {
    this.authService.logout(false);
  }
}
