import { Routes } from '@angular/router';

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
  { path: '**', redirectTo: '' }
];
