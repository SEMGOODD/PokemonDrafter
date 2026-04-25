import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { APP_ENV, loadAppEnv } from './core/env/app-env';
import { authInterceptor } from './core/auth/auth.interceptor';
import { routes } from './app.routes';

function saveTokenFromUrl(): () => void {
  return () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('access_token', token);
      const clean = new URL(window.location.href);
      clean.searchParams.delete('token');
      window.history.replaceState({}, '', clean.toString());
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: APP_ENV, useFactory: loadAppEnv },
    {
      provide: APP_INITIALIZER,
      useFactory: saveTokenFromUrl,
      multi: true
    }
  ]
};
