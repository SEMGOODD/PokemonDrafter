import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  // Verifie que la racine Angular se cree avec le routeur de test (smoke shell).
  it('devrait instancier le composant racine', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que sans returnPath dans l URL aucune navigation supplementaire n est forcee au demarrage.
  it('ne devrait pas appeler navigateByUrl si aucun returnPath', () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
