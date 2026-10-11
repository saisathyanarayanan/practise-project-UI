export interface HashedUser {
  id: number;
  username: string;
  passwordHash: string;
  salt: string;
  role: string;
  createdAt: string;
}

export interface DirectUser {
  id: number;
  username: string;
  password: string;
  role: string;
}

export interface CreateHashedUserRequest {
  username: string;
  password: string;
  role: string;
}

export interface CreateDirectUserRequest {
  username: string;
  password: string;
  role: string;
}

export interface VerifyPasswordRequest {
  id: number;
  candidatePassword: string;
}

export interface VerifyPasswordResponse {
  isMatch: boolean;
  message: string;
  explanation: string;
}

export interface DirectUsersResponse {
  viewMode: string;
  count: number;
  users: DirectUser[];
}
