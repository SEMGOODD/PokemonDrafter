import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { APP_ENV } from '../env/app-env';
import { AuthService } from './auth.service';

const HTTP_UNAUTHORIZED = 401;

// Chemins publics de la gateway : on ne doit jamais y joindre un Bearer.
// Spring Security OAuth2 valide le JWT des qu'un header Authorization est present,
// meme sur une route permitAll, et renvoie 401 si le token est invalide/expire.
const PUBLIC_GATEWAY_PATH_PREFIXES = ['/api/auth/', '/api/pokemon/', '/api/types/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(APP_ENV);
  const authService = inject(AuthService);

  if (!req.url.startsWith(env.GATEWAY_URL)) {
    return next(req);
  }

  if (isPublicGatewayPath(req.url, env.GATEWAY_URL)) {
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

function isPublicGatewayPath(fullUrl: string, gatewayUrl: string): boolean {
  const pathStart = fullUrl.indexOf('/', gatewayUrl.length);
  const path = pathStart >= 0 ? fullUrl.substring(pathStart) : '';
  return PUBLIC_GATEWAY_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
}
