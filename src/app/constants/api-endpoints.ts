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
  },
  userManagement: {
    hashedCreate: `${baseUrl}/api/usermanagement/hashed`,
    hashedList:   `${baseUrl}/api/usermanagement/hashed`,
    hashedVerify: `${baseUrl}/api/usermanagement/hashed/verify`,
    directCreate: `${baseUrl}/api/usermanagement/direct`,
    directList:   `${baseUrl}/api/usermanagement/direct`
  },
  person: {
    create: `${baseUrl}/api/person`,
    list: `${baseUrl}/api/person`,
    audit: `${baseUrl}/api/person/audit`,
    clear: `${baseUrl}/api/person/clear-test-data`
  },
  oauth: {
    authorize: `${baseUrl}/api/oauth/authorize`,
    token: `${baseUrl}/api/oauth/token`,
    userinfo: `${baseUrl}/api/oauth/userinfo`,
    revoke: `${baseUrl}/api/oauth/revoke`,
    introspect: `${baseUrl}/api/oauth/introspect`,
    discovery: `${baseUrl}/.well-known/openid-configuration`
  }
} as const;

