import { environment } from '../../environments/environment';

const baseUrl = environment.apiBaseUrl;

export const API_ENDPOINTS = {
  test: {
    methodOne: baseUrl + '/api/test/method-one',
    methodTwo: `${baseUrl}/api/test/method-two`,
    departmentTest: `${baseUrl}/api/Department/test`
  },
  timeoffice: {
    status: `${baseUrl}/api/timeoffice/status`,
    attendance: `${baseUrl}/api/timeoffice`
  },
  employee: {
    list: `${baseUrl}/api/Employee`,
    summary: `${baseUrl}/api/Employee/summary`
  },
  auth: {
    login:   `${baseUrl}/api/auth/login`,
    refresh: `${baseUrl}/api/auth/refresh`
  }
} as const;

