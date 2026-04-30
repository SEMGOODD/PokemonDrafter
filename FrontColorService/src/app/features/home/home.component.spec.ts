import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { APP_ENV } from '../../core/env/app-env';
import { AuthService } from '../../core/auth/auth.service';
import { createColorAppEnv } from '../../../testing/color-app-env.stub';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  describe('session absente', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HomeComponent],
        providers: [
          provideRouter([]),
          { provide: APP_ENV, useValue: createColorAppEnv('red') },
          { provide: AuthService, useValue: { isLoggedIn: vi.fn().mockReturnValue(false) } }
        ]
      }).compileComponents();
    });

    // Verifie que la page d accueil se monte avec AuthService et APP_ENV disponibles.
    it('devrait instancier le composant', () => {
      const fixture = TestBed.createComponent(HomeComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('session presente', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HomeComponent],
        providers: [
          provideRouter([]),
          { provide: APP_ENV, useValue: createColorAppEnv('red') },
          { provide: AuthService, useValue: { isLoggedIn: vi.fn().mockReturnValue(true) } }
        ]
      }).compileComponents();
    });

    // Verifie que le signal loggedIn reflete le resultat d isLoggedIn (liaison etat session).
    it('devrait marquer loggedIn a true lorsque isLoggedIn retourne true', () => {
      const fixture = TestBed.createComponent(HomeComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.loggedIn()).toBe(true);
    });
  });
});
