import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import {
  CreateDirectUserRequest,
  CreateHashedUserRequest,
  DirectUsersResponse,
  HashedUser,
  VerifyPasswordRequest,
  VerifyPasswordResponse
} from '../models/user-management.models';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  constructor(private readonly http: HttpClient) {}

  // Form 1: Argon2id Hashed Users
  createHashedUser(payload: CreateHashedUserRequest): Observable<{ message: string; user: HashedUser }> {
    return this.http.post<{ message: string; user: HashedUser }>(
      API_ENDPOINTS.userManagement.hashedCreate,
      payload
    );
  }

  getHashedUsers(): Observable<HashedUser[]> {
    return this.http.get<HashedUser[]>(API_ENDPOINTS.userManagement.hashedList);
  }

  verifyHashedPassword(payload: VerifyPasswordRequest): Observable<VerifyPasswordResponse> {
    return this.http.post<VerifyPasswordResponse>(
      API_ENDPOINTS.userManagement.hashedVerify,
      payload
    );
  }

  // Form 2: Direct Users with SQL Dynamic Data Masking
  createDirectUser(payload: CreateDirectUserRequest): Observable<{ message: string; user: any }> {
    return this.http.post<{ message: string; user: any }>(
      API_ENDPOINTS.userManagement.directCreate,
      payload
    );
  }

  getDirectUsers(asMaskedViewer: boolean = false): Observable<DirectUsersResponse> {
    const url = `${API_ENDPOINTS.userManagement.directList}?asMaskedViewer=${asMaskedViewer}`;
    return this.http.get<DirectUsersResponse>(url);
  }
}
