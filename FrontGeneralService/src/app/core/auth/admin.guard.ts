import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

const DASHBOARD_ROUTE = '/dashboard';
const AUTH_ROUTE = '/auth';

/**
 * Garde combinant authentification et rôle admin. La gateway revérifie le rôle
 * côté serveur ; ce guard sert seulement à masquer l'UI et éviter un appel HTTP
 * inutile pour les non-admins.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree([AUTH_ROUTE]);
  }
  if (!auth.isAdmin()) {
    return router.createUrlTree([DASHBOARD_ROUTE]);
  }
  return true;
};
