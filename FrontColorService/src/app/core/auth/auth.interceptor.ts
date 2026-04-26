import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { APP_ENV } from '../env/app-env';
import { AuthService } from './auth.service';

const PUBLIC_PREFIXES = ['/api/pokemon/', '/api/types/', '/api/auth/'];

function isPublicPath(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix));
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const env = inject(APP_ENV);
  const auth = inject(AuthService);

  const isGatewayRequest = req.url.startsWith(env.GATEWAY_URL);
  const token = auth.getToken();

  let outReq = req;
  if (isGatewayRequest && token && !isPublicPath(req.url)) {
    outReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(outReq).pipe(
    catchError(err => {
      if (err.status === 401 && isGatewayRequest) {
        window.location.href = `${env.FRONT_GENERAL_URL}/dashboard`;
      }
      return throwError(() => err);
    })
  );
};
