import { environment } from '../../environments/environment';

const baseUrl = environment.apiBaseUrl;

export const API_ENDPOINTS = {
  test: {
    // methodOne: `${baseUrl}/api/test/method-one`,
    methodOne: baseUrl + '/api/test/method-one',
    methodTwo: `${baseUrl}/api/test/method-two`
  }
} as const;


// REASON Y AS CONST IS USED AT LAST --

// WITHOUT AS CONST --

// export const API_ENDPOINTS = {
//   test: {
//     methodOne: `${baseUrl}/api/test/method-one`
//   }
// };

// TypeScript treats methodOne as just a plain string.
// It means that any class can modify the end points ie) since it is treated as a string , any class can assign new value to it and mutate the end points which is not acceptable.
// TS allows it TypeScript won't complain

// ie)
// API_ENDPOINTS.test.methodOne = 'http://some-hacker-url.com'; // ✅ no error!

// WITH AS CONST --

// export const API_ENDPOINTS = {
//   test: {
//     methodOne: `${baseUrl}/api/test/method-one`
//   }
// } as const;

// NOW TS WILL TREAT EVERYTHING AS READONLY AND WILL NOT ALLOW ANY CLASS TO MUTATE THE END POINTS
// ie)
// API_ENDPOINTS.test.methodOne = 'http://some-hacker-url.com'; // ❌ error TS2540: Cannot assign to 'methodOne' because it is a read-only property.

