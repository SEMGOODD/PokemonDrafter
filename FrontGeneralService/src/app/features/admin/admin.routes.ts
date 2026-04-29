import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'logs',
    loadComponent: () => import('./admin-logs/admin-logs.component').then(m => m.AdminLogsComponent)
  },
  { path: '', redirectTo: 'logs', pathMatch: 'full' }
];
