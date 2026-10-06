import { Component, inject } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App {
  readonly authService = inject(AuthService);

  extendSession(): void {
    this.authService.refreshToken().subscribe({
      next: () => {
        console.log('Session extended successfully');
      },
      error: (err) => {
        console.error('Failed to extend session', err);
      }
    });
  }
}
