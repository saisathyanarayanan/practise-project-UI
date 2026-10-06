import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: false
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = signal('sathya');
  password = signal('pass123');
  isLoading = signal(false);
  errorMessage = signal('');

  onSubmit(): void {
    if (!this.username() || !this.password()) {
      this.errorMessage.set('Please provide both username and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService
      .login({
        username: this.username(),
        password: this.password()
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          if (err.status === 401) {
            this.errorMessage.set(err.error?.message || 'Invalid username or password.');
          } else {
            this.errorMessage.set(`Login failed (${err.status}): ${err.message}`);
          }
        }
      });
  }

  fillUser(u: string, p: string): void {
    this.username.set(u);
    this.password.set(p);
  }
}
