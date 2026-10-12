export interface CreatePersonRequest {
  name: string;
  age: number;
  sex: string;
  phoneNumber: string;
}

export interface Person {
  id: number;
  idempotencyKey: string;
  name: string;
  age: number;
  sex: string;
  phoneNumber: string;
  createdAt: string;
}

export interface IdempotentApiResponse<T> {
  success: boolean;
  isReplay: boolean;
  idempotencyKey: string;
  message: string;
  data: T;
  processedAt: string;
}

export interface IdempotencyAuditRecord {
  idempotencyKey: string;
  requestPath: string;
  requestHash: string;
  status: string;
  statusCode: number | null;
  responseBody: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface SubmissionAttempt {
  attemptNumber: number;
  timestamp: string;
  idempotencyKey: string;
  httpStatus: number | string;
  isReplay: boolean;
  message: string;
  personName: string;
}
