import { Component, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: false
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

// client ID ---- 889566822599-250cinrf063t662h13roitd1micem5l3.apps.googleusercontent.com

  readonly googleClientId = '889566822599-250cinrf063t662h13roitd1micem5l3.apps.googleusercontent.com';

  username = signal('sathya');
  password = signal('pass123');
  isLoading = signal(false);
  errorMessage = signal('');
  isOffline = signal(!navigator.onLine);

  private readonly onlineHandler = () => {
    this.isOffline.set(false);
    if (this.errorMessage() === 'Google Sign-In is unavailable while offline.') {
      this.errorMessage.set('');
    }
    this.initGoogleSignIn();
  };

  private readonly offlineHandler = () => {
    this.isOffline.set(true);
    this.errorMessage.set('Google Sign-In is unavailable while offline.');
  };

  ngAfterViewInit(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    if (!navigator.onLine) {
      this.errorMessage.set('Google Sign-In is unavailable while offline.');
      return;
    }

    this.initGoogleSignIn();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }

  private initGoogleSignIn(): void {
    if (!navigator.onLine) {
      this.isOffline.set(true);
      this.errorMessage.set('Google Sign-In is unavailable while offline.');
      return;
    }

    if (typeof google !== 'undefined' && google.accounts?.id) {
      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: any) =>
          { console.log('Google Sign-In response ----:', response); 
            this.handleGoogleCredential(response); }
      });

      const btnElement = document.getElementById('googleSignInBtn');
      if (btnElement) {
        google.accounts.id.renderButton(btnElement, {
          theme: 'outline',
          size: 'large',
          width: 340,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        });
      }
    } else {
      // Retry shortly if the Google library is still downloading asynchronously
      setTimeout(() => this.initGoogleSignIn(), 250);
    }
  }

  private handleGoogleCredential(response: any): void {
    if (!response || !response.credential) {
      this.errorMessage.set('Google sign-in did not return a valid credential.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginWithGoogle(response.credential).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set(err.error?.message || 'Google token expired or unauthorized. Please sign in again.');
        } else {
          this.errorMessage.set(`Google authentication failed (${err.status}): ${err.error?.message || err.message}`);
        }
      }
    });
  }

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
