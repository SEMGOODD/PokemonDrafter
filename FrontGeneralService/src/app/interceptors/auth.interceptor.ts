import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

const GATEWAY_URL = 'http://localhost:8000';

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
) => {
    const authService = inject(AuthService);

    if (!req.url.startsWith(GATEWAY_URL)) {
        return next(req);
    }

    const token = localStorage.getItem('access_token');
    if (!token) return next(req);

    const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
    });

    return next(authReq).pipe(
        catchError((err) => {
            if (err.status === 401) {
                authService.logout();
            }
            return throwError(() => err);
        })
    );
};