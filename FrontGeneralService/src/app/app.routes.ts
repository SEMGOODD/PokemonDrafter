import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { CallbackComponent } from './callback/callback.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: 'auth', component: AuthComponent },
    { path: 'callback', component: CallbackComponent },
    { path: 'dashboard', canActivate: [authGuard], component: AuthComponent },
    { path: '', redirectTo: 'auth', pathMatch: 'full' },
    { path: '**', redirectTo: 'auth' },
];