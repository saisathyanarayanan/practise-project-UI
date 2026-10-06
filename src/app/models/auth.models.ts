export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface DecodedToken {
  nameid?: string;
  unique_name?: string;
  role?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  [key: string]: any;
}
