import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class TestApiService {
  constructor(private readonly http: HttpClient) {}

  getMethodOne(): Observable<string> {
    return this.http.get(API_ENDPOINTS.test.methodOne, { responseType: 'text' });
  }

  getMethodTwo(): Observable<string> {
    return this.http.get(API_ENDPOINTS.test.methodTwo, { responseType: 'text' });
  }
}