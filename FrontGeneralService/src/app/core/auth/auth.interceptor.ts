import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { APP_ENV } from '../env/app-env';
import { AuthService } from './auth.service';

const HTTP_UNAUTHORIZED = 401;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(APP_ENV);
  const authService = inject(AuthService);

  if (!req.url.startsWith(env.GATEWAY_URL)) {
    return next(req);
  }

  const token = authService.getToken();
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === HTTP_UNAUTHORIZED) {
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
