import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'pokedex',
    loadComponent: () => import('./features/pokedex/pokedex-search/pokedex-search.component').then(m => m.PokedexSearchComponent)
  },
  {
    path: 'pokedex/:id',
    loadComponent: () => import('./features/pokedex/pokedex-detail/pokedex-detail.component').then(m => m.PokedexDetailComponent)
  },
  {
    path: 'combat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/combat/battle-list/battle-list.component').then(m => m.BattleListComponent)
  },
  {
    path: 'combat/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/combat/battle-create/battle-create.component').then(m => m.BattleCreateComponent)
  },
  {
    path: 'combat/battle/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/combat/battle-view/battle-view.component').then(m => m.BattleViewComponent)
  },
  {
    path: 'teams',
    canActivate: [authGuard],
    loadComponent: () => import('./features/teams/team-list/team-list.component')
      .then(m => m.TeamListComponent)
  },
  {
    path: 'teams/:teamId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/teams/team-detail/team-detail.component')
      .then(m => m.TeamDetailComponent)
  },
  {
    path: 'teams/:teamId/complete',
    canActivate: [authGuard],
    loadComponent: () => import('./features/teams/team-complete/team-complete.component')
      .then(m => m.TeamCompleteComponent)
  },
  {
    path: 'cgu',
    loadComponent: () => import('./features/legal/cgu.component').then(m => m.CguComponent)
  },
  {
    path: 'contacts',
    loadComponent: () => import('./features/legal/contacts.component').then(m => m.ContactsComponent)
  },
  { path: '**', redirectTo: '' }
];
