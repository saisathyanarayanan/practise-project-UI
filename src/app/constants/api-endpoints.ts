import { environment } from '../../environments/environment';

const baseUrl = environment.apiBaseUrl;

export const API_ENDPOINTS = {
  test: {
    // methodOne: `${baseUrl}/api/test/method-one`,
    methodOne: baseUrl + '/api/test/method-one',
    methodTwo: `${baseUrl}/api/test/method-two`
  },
  auth: {
    login:   `${baseUrl}/api/auth/login`,
    refresh: `${baseUrl}/api/auth/refresh`
  }
} as const;

