import { Component, OnInit, signal } from '@angular/core';
import { DirectUser, HashedUser, VerifyPasswordResponse } from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';

@Component({
  selector: 'app-user-management',
  standalone: false,
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  // Navigation / Tabs
  activeTab = signal<'form1' | 'form2' | 'both'>('both');

  // Form 1 State (Argon2id)
  f1Username = signal('');
  f1Password = signal('');
  f1Role = signal('User');
  f1IsSubmitting = signal(false);
  f1StatusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form 1 Table & Verification State
  hashedUsers = signal<HashedUser[]>([]);
  isLoadingHashed = signal(false);
  verifyUserId = signal<number | null>(null);
  candidatePassword = signal('');
  verifyResult = signal<VerifyPasswordResponse | null>(null);
  isVerifying = signal(false);

  // Form 2 State (Direct / Dynamic Data Masking)
  f2Username = signal('');
  f2Password = signal('');
  f2Role = signal('User');
  f2IsSubmitting = signal(false);
  f2StatusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form 2 Table State
  directUsers = signal<DirectUser[]>([]);
  directViewMode = signal<string>('Standard Masked');
  asMaskedViewer = signal(true); // default to demonstrating SQL Server DDM
  isLoadingDirect = signal(false);

  // Copy notification helper
  copiedHashId = signal<number | null>(null);

  constructor(private readonly userMgmtService: UserManagementService) {}

  ngOnInit(): void {
    this.loadHashedUsers();
    this.loadDirectUsers();
  }

  // --- Form 1 Methods ---
  submitHashedUser(): void {
    if (!this.f1Username().trim() || !this.f1Password()) {
      this.f1StatusMessage.set({ type: 'error', text: 'Username and Password are required.' });
      return;
    }

    this.f1IsSubmitting.set(true);
    this.f1StatusMessage.set(null);

    this.userMgmtService.createHashedUser({
      username: this.f1Username().trim(),
      password: this.f1Password(),
      role: this.f1Role().trim() || 'User'
    }).subscribe({
      next: (res) => {
        this.f1IsSubmitting.set(false);
        this.f1StatusMessage.set({
          type: 'success',
          text: `✅ ${res.message} (User: ${res.user.username}, ID: ${res.user.id})`
        });
        // Clear inputs
        this.f1Username.set('');
        this.f1Password.set('');
        // Reload table
        this.loadHashedUsers();
      },
      error: (err) => {
        this.f1IsSubmitting.set(false);
        this.f1StatusMessage.set({
          type: 'error',
          text: `❌ Error: ${err.error?.message || err.message || 'Failed to save hashed user.'}`
        });
      }
    });
  }

  loadHashedUsers(): void {
    this.isLoadingHashed.set(true);
    this.userMgmtService.getHashedUsers().subscribe({
      next: (users) => {
        this.hashedUsers.set(users);
        this.isLoadingHashed.set(false);
      },
      error: () => {
        this.isLoadingHashed.set(false);
      }
    });
  }

  openVerifyModal(user: HashedUser): void {
    this.verifyUserId.set(user.id);
    this.candidatePassword.set('');
    this.verifyResult.set(null);
  }

  closeVerifyModal(): void {
    this.verifyUserId.set(null);
    this.candidatePassword.set('');
    this.verifyResult.set(null);
  }

  verifyPassword(): void {
    const userId = this.verifyUserId();
    if (!userId || !this.candidatePassword()) return;

    this.isVerifying.set(true);
    this.verifyResult.set(null);

    this.userMgmtService.verifyHashedPassword({
      id: userId,
      candidatePassword: this.candidatePassword()
    }).subscribe({
      next: (res) => {
        this.verifyResult.set(res);
        this.isVerifying.set(false);
      },
      error: (err) => {
        this.verifyResult.set({
          isMatch: false,
          message: 'Verification failed',
          explanation: err.error?.message || err.message
        });
        this.isVerifying.set(false);
      }
    });
  }

  copyToClipboard(text: string, id: number): void {
    navigator.clipboard.writeText(text);
    this.copiedHashId.set(id);
    setTimeout(() => {
      if (this.copiedHashId() === id) {
        this.copiedHashId.set(null);
      }
    }, 2000);
  }

  // --- Form 2 Methods ---
  submitDirectUser(): void {
    if (!this.f2Username().trim() || !this.f2Password()) {
      this.f2StatusMessage.set({ type: 'error', text: 'Username and Password are required.' });
      return;
    }

    this.f2IsSubmitting.set(true);
    this.f2StatusMessage.set(null);

    this.userMgmtService.createDirectUser({
      username: this.f2Username().trim(),
      password: this.f2Password(),
      role: this.f2Role().trim() || 'User'
    }).subscribe({
      next: (res) => {
        this.f2IsSubmitting.set(false);
        this.f2StatusMessage.set({
          type: 'success',
          text: `✅ ${res.message} (User: ${res.user.username}, ID: ${res.user.id})`
        });
        this.f2Username.set('');
        this.f2Password.set('');
        this.loadDirectUsers();
      },
      error: (err) => {
        this.f2IsSubmitting.set(false);
        this.f2StatusMessage.set({
          type: 'error',
          text: `❌ Error: ${err.error?.message || err.message || 'Failed to save direct user.'}`
        });
      }
    });
  }

  loadDirectUsers(): void {
    this.isLoadingDirect.set(true);
    this.userMgmtService.getDirectUsers(this.asMaskedViewer()).subscribe({
      next: (res) => {
        this.directUsers.set(res.users);
        this.directViewMode.set(res.viewMode);
        this.isLoadingDirect.set(false);
      },
      error: () => {
        this.isLoadingDirect.set(false);
      }
    });
  }

  toggleMaskedView(asMasked: boolean): void {
    this.asMaskedViewer.set(asMasked);
    this.loadDirectUsers();
  }
}
