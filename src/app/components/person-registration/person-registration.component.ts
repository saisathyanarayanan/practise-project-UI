import { Component, OnInit, signal } from '@angular/core';
import { PersonService } from '../../services/person.service';
import {
  CreatePersonRequest,
  IdempotentApiResponse,
  Person,
  SubmissionAttempt
} from '../../models/person.models';
import { forkJoin } from 'rxjs';

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
    this.generateNewIdempotencyKey();
    this.loadPersons();
  }

  /**
   * Generates a cryptographically random UUID v4 representing a single client intent/action.
   * it will in the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is any hexadecimal digit and y is one of 8, 9, A, or B.
   */
  generateNewIdempotencyKey(): void {
    const newKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : this.fallbackGuid();
    this.currentIdempotencyKey.set(newKey);
    this.clickCounter.set(0);
    this.statusAlert.set({
      type: 'info',
      message: `Fresh Idempotency-Key generated: ${newKey}. Ready for testing!`
    });
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

    const key = this.currentIdempotencyKey();
    const currentAttempt = this.clickCounter() + 1;
    this.clickCounter.set(currentAttempt);
    this.totalClicks.update(n => n + 1);

    this.isRequesting.set(true);

    this.personService.createPerson(payload, key).subscribe({
      next: (response: IdempotentApiResponse<Person>) => {

        console.log('Response received now for relay ----:', response);
        this.isRequesting.set(false);
        this.recordAttempt(currentAttempt, key, response.isReplay ? 200 : 201, response.isReplay, response.message, payload.name);

        if (response.isReplay) {
          this.totalReplaysBlocked.update(n => n + 1);
          this.statusAlert.set({
            type: 'warning',
            isReplay: true,
            message: `⚡ IDEMPOTENT REPLAY DETECTED! (Attempt #${currentAttempt})\nThe server identified key '${key}' was already executed. The cached response was returned safely without creating any duplicate rows in the database!`
          });
        } else {
          this.totalDbInserts.update(n => n + 1);
          this.statusAlert.set({
            type: 'success',
            isReplay: false,
            message: `✅ FIRST SUBMISSION SUCCESSFUL! (Attempt #${currentAttempt})\nNew row inserted into SQL Server Persons table with unique key '${key}'.\nNow try clicking Submit AGAIN to test idempotency duplicate protection!`
          });
        }

        // Refresh DB table to prove row count
        this.loadPersons();
      },
      error: (err) => {
        this.isRequesting.set(false);
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

    const key = this.currentIdempotencyKey();
    const startAttempt = this.clickCounter();
    this.clickCounter.update(c => c + 2);
    this.totalClicks.update(n => n + 2);
    this.isRequesting.set(true);

    // Fire 2 concurrent HTTP requests simultaneously
    const req1$ = this.personService.createPerson(payload, key);
    const req2$ = this.personService.createPerson(payload, key);

    forkJoin([req1$, req2$]).subscribe({    // forkJoin() is an RxJS operator that runs multiple Observables and waits until all of them complete before executing the next block.
      next: ([res1, res2]) => {
        this.isRequesting.set(false);
        this.recordAttempt(startAttempt + 1, key, res1.isReplay ? 200 : 201, res1.isReplay, res1.message, payload.name);
        this.recordAttempt(startAttempt + 2, key, res2.isReplay ? 200 : 201, res2.isReplay, res2.message, payload.name);

        if (res1.isReplay) this.totalReplaysBlocked.update(n => n + 1); else this.totalDbInserts.update(n => n + 1);
        if (res2.isReplay) this.totalReplaysBlocked.update(n => n + 1); else this.totalDbInserts.update(n => n + 1);

        this.statusAlert.set({
          type: 'info',
          message: `⚡ Rapid Double-Click Simulation Finished!\nRequest 1: ${res1.isReplay ? 'Replay' : 'Created'}\nRequest 2: ${res2.isReplay ? 'Replay (Duplicate Prevented!)' : 'Created'}\nCheck the database below — zero duplicate records!`
        });

        this.loadPersons();
      },
      error: (err) => {
        this.isRequesting.set(false);
        this.statusAlert.set({
          type: 'warning',
          message: `Simulation response received: ${err.error?.message || err.message}`
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

    const key = this.currentIdempotencyKey();
    const startAttempt = this.clickCounter();
    this.clickCounter.update(c => c + 5);
    this.totalClicks.update(n => n + 5);
    this.isRequesting.set(true);

    const requests = Array.from({ length: 5 }, () => this.personService.createPerson(payload, key));

    forkJoin(requests).subscribe({
      next: (results) => {
        this.isRequesting.set(false);
        results.forEach((res, index) => {
          this.recordAttempt(startAttempt + index + 1, key, res.isReplay ? 200 : 201, res.isReplay, res.message, payload.name);
          if (res.isReplay) this.totalReplaysBlocked.update(n => n + 1);
          else this.totalDbInserts.update(n => n + 1);
        });

        this.statusAlert.set({
          type: 'info',
          message: `🔥 5x Spam Click Completed! 5 simultaneous requests sent. Only 1 record was written to the database; the other 4 were safely recognized and replayed.`
        });

        this.loadPersons();
      },
      error: (err) => {
        this.isRequesting.set(false);
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
        this.generateNewIdempotencyKey();
        this.statusAlert.set({
          type: 'info',
          message: 'All test data and idempotency audit logs cleared successfully.'
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
