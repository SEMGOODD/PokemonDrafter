import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { APP_ENV } from '../env/app-env';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const env = inject(APP_ENV);

  if (auth.isLoggedIn()) return true;

  const returnPath = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `${env.FRONT_GENERAL_URL}/dashboard?returnPath=${returnPath}`;
  return false;
};
