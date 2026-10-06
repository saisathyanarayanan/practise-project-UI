import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

/**
 * A simple demonstration interceptor that logs the lifecycle of HTTP requests.
 * This helps demonstrate how multiple interceptors are chained together.
 */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = Date.now();
  console.log(`[LoggingInterceptor ➡️ Outgoing]: ${req.method} ${req.url}`);

  // Pass request to the next interceptor (or backend)
  return next(req).pipe(
    tap({
      next: () => {
        const elapsed = Date.now() - startTime;
        console.log(`[LoggingInterceptor ⬅️ Response]: ${req.method} ${req.url} completed in ${elapsed}ms`);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        console.error(`[LoggingInterceptor ⬅️ Error]: ${req.method} ${req.url} failed after ${elapsed}ms`, err);
      }
    })
  );
};
