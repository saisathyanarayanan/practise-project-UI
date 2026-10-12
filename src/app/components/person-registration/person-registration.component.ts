import { Component, OnInit, signal } from '@angular/core';
import { PersonService } from '../../services/person.service';
import {
  CreatePersonRequest,
  IdempotentApiResponse,
  Person,
  SubmissionAttempt
} from '../../models/person.models';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-person-registration',
  standalone: false,
  templateUrl: './person-registration.component.html',
  styleUrls: ['./person-registration.component.scss']
})
export class PersonRegistrationComponent implements OnInit {
  // Form input fields
  name = signal<string>('John Doe');
  age = signal<number>(29);
  sex = signal<string>('Male');
  phoneNumber = signal<string>('+1-555-0199');

  // Enterprise Idempotency Key state
  currentIdempotencyKey = signal<string>('');
  lastUsedKey = signal<string | null>(null);
  autoRefreshOnSuccess = signal<boolean>(true);
  clickCounter = signal<number>(0);
  isRequesting = signal<boolean>(false);

  // Status & Feedback
  statusAlert = signal<{ type: 'success' | 'info' | 'warning' | 'error'; message: string; isReplay?: boolean } | null>(null);

  // Submission History / Audit Feed
  attemptHistory = signal<SubmissionAttempt[]>([]);

  // Live Database Table state
  dbPersons = signal<Person[]>([]);
  isLoadingPersons = signal<boolean>(false);

  // Stats
  totalClicks = signal<number>(0);
  totalDbInserts = signal<number>(0);
  totalReplaysBlocked = signal<number>(0);

  constructor(private readonly personService: PersonService) {}

  ngOnInit(): void {
    // Key starts EMPTY as requested: generated on the fly at request time
    this.loadPersons();
  }

  /**
   * Generates a cryptographically random UUID v4 representing a single client intent/action.
   * it will in the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is any hexadecimal digit and y is one of 8, 9, A, or B.
   */
  generateNewUUID(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : this.fallbackGuid();
  }

  private fallbackGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;           // bitwise OR applied to ignore decimal part, gives integer between 0-15
                                                    // * 16 is used as hexadecimal has 16 digits (0-9, a-f)
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private recordAttempt(attemptNumber: number,idempotencyKey: string,httpStatus: number | string,isReplay: boolean,message: string,personName: string): void {
    const entry: SubmissionAttempt = {
      attemptNumber,
      timestamp: new Date().toLocaleTimeString(),
      idempotencyKey,
      httpStatus,
      isReplay,
      message,
      personName
    };
    this.attemptHistory.update(list => [entry, ...list]);
  }

  submitForm(): void {
    const payload = this.getPayload();
    if (!payload) return;

    // If ALREADY in-flight (rapid double-click before response finishes), reuse the active key!
    // If NOT in-flight (fresh submission), generate a brand new UUID!
    let key = this.currentIdempotencyKey();
    if (!this.isRequesting() || !key) {
      key = this.generateNewUUID();
      this.currentIdempotencyKey.set(key);
    }

    this.lastUsedKey.set(key);
    const currentAttempt = this.clickCounter() + 1;
    this.clickCounter.set(currentAttempt);
    this.totalClicks.update(n => n + 1);

    this.isRequesting.set(true);

    this.personService.createPerson(payload, key).subscribe({
      next: (response: IdempotentApiResponse<Person>) => {

        console.log('Response received now for relay ----:', response);
        this.isRequesting.set(false);
        // ALWAYS clear current in-flight key upon completion!
        this.currentIdempotencyKey.set('');
        this.clickCounter.set(0);

        this.recordAttempt(currentAttempt, key, response.isReplay ? 200 : 201, response.isReplay, response.message, payload.name);

        if (response.isReplay) {
          this.totalReplaysBlocked.update(n => n + 1);
          this.statusAlert.set({
            type: 'warning',
            isReplay: true,
            message: `⚡ IDEMPOTENT REPLAY DETECTED! (Attempt #${currentAttempt})\nThe server identified key '${key}' was already executed. Returned cached record safely without duplicates in DB!`
          });
        } else {
          this.totalDbInserts.update(n => n + 1);
          this.statusAlert.set({
            type: 'success',
            isReplay: false,
            message: `✅ SUBMISSION SUCCESSFUL! (Attempt #${currentAttempt})\nNew row inserted into SQL Server with key '${key}'.\nKey is now cleared so your next submission will generate a fresh key!`
          });
        }

        this.loadPersons();
      },
      error: (err) => {
        this.isRequesting.set(false);
        this.currentIdempotencyKey.set('');
        this.clickCounter.set(0);

        const errMsg = err.error?.message || err.message || 'An error occurred';
        const statusCode = err.status || 'ERR';
        this.recordAttempt(currentAttempt, key, statusCode, false, errMsg, payload.name);
        this.statusAlert.set({
          type: 'error',
          message: `Submission Failed [${statusCode}]: ${errMsg}`
        });
      }
    });
  }

  /**
   * Simulates a rapid double-click (2 requests fired at the exact same millisecond).
   */
  testRapidDoubleClick(): void {
    const payload = this.getPayload();
    if (!payload) return;

    // Both requests share the exact same generated key
    const key = this.generateNewUUID();
    this.currentIdempotencyKey.set(key);
    this.lastUsedKey.set(key);
    this.isRequesting.set(true);

    const startAttempt = this.clickCounter();
    this.clickCounter.update(c => c + 2);
    this.totalClicks.update(n => n + 2);

    const req1$ = this.personService.createPerson(payload, key).pipe(
      catchError(err => of({ isError: true, status: err.status || 500, message: err.error?.message || err.message } as any))
    );
    const req2$ = this.personService.createPerson(payload, key).pipe(
      catchError(err => of({ isError: true, status: err.status || 500, message: err.error?.message || err.message } as any))
    );

    forkJoin([req1$, req2$]).subscribe({
      next: ([res1, res2]) => {
        this.isRequesting.set(false);
        this.currentIdempotencyKey.set('');
        this.clickCounter.set(0);

        const handleRes = (res: any, attemptNum: number) => {
          if (res.isError) {
            this.recordAttempt(attemptNum, key, res.status, false, res.message, payload.name);
          } else {
            this.recordAttempt(attemptNum, key, res.isReplay ? 200 : 201, res.isReplay, res.message, payload.name);
            if (res.isReplay) this.totalReplaysBlocked.update(n => n + 1);
            else this.totalDbInserts.update(n => n + 1);
          }
        };

        handleRes(res1, startAttempt + 1);
        handleRes(res2, startAttempt + 2);

        this.statusAlert.set({
          type: 'info',
          message: `⚡ Rapid Double-Click Simulation Finished!\n2 requests fired simultaneously with key '${key}'.\nKey is now cleared so your next submission starts fresh!`
        });

        this.loadPersons();
      }
    });
  }

  /**
   * Simulates an aggressive 5x spam click storm with the same Idempotency-Key.
   */
  testAggressiveSpam(): void {
    const payload = this.getPayload();
    if (!payload) return;

    const key = this.generateNewUUID();
    this.currentIdempotencyKey.set(key);
    this.lastUsedKey.set(key);
    this.isRequesting.set(true);

    const startAttempt = this.clickCounter();
    this.clickCounter.update(c => c + 5);
    this.totalClicks.update(n => n + 5);

    const requests = Array.from({ length: 5 }, () =>
      this.personService.createPerson(payload, key).pipe(
        catchError(err => of({ isError: true, status: err.status || 500, message: err.error?.message || err.message } as any))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.isRequesting.set(false);
        this.currentIdempotencyKey.set('');
        this.clickCounter.set(0);

        results.forEach((res, index) => {
          const attemptNum = startAttempt + index + 1;
          if (res.isError) {
            this.recordAttempt(attemptNum, key, res.status, false, res.message, payload.name);
          } else {
            this.recordAttempt(attemptNum, key, res.isReplay ? 200 : 201, res.isReplay, res.message, payload.name);
            if (res.isReplay) this.totalReplaysBlocked.update(n => n + 1);
            else this.totalDbInserts.update(n => n + 1);
          }
        });

        this.statusAlert.set({
          type: 'info',
          message: `🔥 5x Spam Click Completed! 5 simultaneous requests sent with key '${key}'.\nKey is now cleared so your next submission starts fresh!`
        });

        this.loadPersons();
      }
    });
  }

  loadPersons(): void {
    this.isLoadingPersons.set(true);
    this.personService.getPersons().subscribe({
      next: (data) => {
        this.dbPersons.set(data);
        this.isLoadingPersons.set(false);
      },
      error: () => {
        this.isLoadingPersons.set(false);
      }
    });
  }

  clearTestData(): void {
    if (!confirm('Are you sure you want to clear all test records from the database?')) return;

    this.personService.clearTestData().subscribe({
      next: () => {
        this.dbPersons.set([]);
        this.attemptHistory.set([]);
        this.totalClicks.set(0);
        this.totalDbInserts.set(0);
        this.totalReplaysBlocked.set(0);
        this.currentIdempotencyKey.set('');
        this.lastUsedKey.set(null);
        this.statusAlert.set({
          type: 'info',
          message: 'All test data and idempotency audit logs cleared successfully. Key is empty and ready for dynamic generation.'
        });
      }
    });
  }

  copyKey(): void {
    navigator.clipboard.writeText(this.currentIdempotencyKey());
    alert('Idempotency Key copied to clipboard!');
  }

  private getPayload(): CreatePersonRequest | null {
    if (!this.name().trim()) {
      alert('Please enter a Name.');
      return null;
    }
    if (!this.age() || this.age() < 1) {
      alert('Please enter a valid Age.');
      return null;
    }
    if (!this.phoneNumber().trim()) {
      alert('Please enter a Phone/Mobile Number.');
      return null;
    }
    return {
      name: this.name().trim(),
      age: Number(this.age()),
      sex: this.sex(),
      phoneNumber: this.phoneNumber().trim()
    };
  }
}
