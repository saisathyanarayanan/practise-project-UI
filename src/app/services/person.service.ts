import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import {
  CreatePersonRequest,
  IdempotentApiResponse,
  IdempotencyAuditRecord,
  Person
} from '../models/person.models';

@Injectable({ providedIn: 'root' })
export class PersonService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Submits person registration with the specified Idempotency-Key HTTP header.
   */
  createPerson(
    payload: CreatePersonRequest,
    idempotencyKey: string
  ): Observable<IdempotentApiResponse<Person>> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    });

    return this.http.post<IdempotentApiResponse<Person>>(
      API_ENDPOINTS.person.create,
      payload,
      { headers }
    );
  }

  /**
   * Fetches all registered persons from the SQL Server database.
   */
  getPersons(): Observable<Person[]> {
    return this.http.get<Person[]>(API_ENDPOINTS.person.list);
  }

  /**
   * Fetches backend idempotency audit records from SQL Server.
   */
  getIdempotencyAudit(): Observable<IdempotencyAuditRecord[]> {
    return this.http.get<IdempotencyAuditRecord[]>(API_ENDPOINTS.person.audit);
  }

  /**
   * Clears test records for reset testing.
   */
  clearTestData(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(API_ENDPOINTS.person.clear);
  }
}
