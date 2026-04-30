import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { APP_ENV, AppEnv } from '../../core/env/app-env';
import { ThemeService } from '../../core/theme/theme.service';
import { createThemeServiceTestDouble } from '../../../testing/theme-service-test-double';
import { AuthComponent } from './auth.component';

const MOCK_GATEWAY_URL = 'http://test.local:8000';
const MOCK_KEYCLOAK_URL = 'http://test.local:8080';
const MOCK_REALM = 'test-realm';
const MOCK_CLIENT_ID = 'test-client';
const TOKEN_PATH = '/protocol/openid-connect/token';

const mockAppEnv: AppEnv = {
  COLOR: 'neutral',
  GATEWAY_URL: MOCK_GATEWAY_URL,
  KEYCLOAK_URL: MOCK_KEYCLOAK_URL,
  KEYCLOAK_REALM: MOCK_REALM,
  KEYCLOAK_CLIENT_ID: MOCK_CLIENT_ID,
  FRONT_RED_URL: 'http://red.local',
  FRONT_BLUE_URL: 'http://blue.local'
};

function keycloakTokenUrl(): string {
  return `${MOCK_KEYCLOAK_URL}/realms/${MOCK_REALM}${TOKEN_PATH}`;
}

describe('AuthComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: mockAppEnv },
        { provide: ThemeService, useFactory: createThemeServiceTestDouble }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // Verifie que l ecran d authentification se monte avec les routes et HTTP configures.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(AuthComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le changement d onglet met bien le formulaire d inscription actif (navigation interne sans requete).
  it('devrait activer l onglet inscription lorsque setTab est appele avec register', () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    component.setTab('register');
    expect(component.activeTab()).toBe('register');
  });

  // Verifie que la soumission login sans identifiants affiche le message de champs manquants (garde-fou UX).
  it('devrait afficher une erreur si login sans identifiants', () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    component.loginForm.username = '';
    component.loginForm.password = '';
    component.onLoginSubmit();
    expect(component.errorMessage()).toContain('champs');
  });

  // Verifie qu un login reussi enregistre les jetons et redirige vers le dashboard (flux nominal).
  it('devrait naviguer vers le dashboard apres login reussi', () => {
    spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    component.loginForm.username = 'user1';
    component.loginForm.password = 'secret12';
    component.onLoginSubmit();
    const request = httpMock.expectOne(keycloakTokenUrl());
    expect(request.request.method).toBe('POST');
    request.flush({
      access_token: 'at',
      refresh_token: 'rt',
      token_type: 'Bearer',
      expires_in: 300
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  // Verifie que le mot de passe trop court est refuse avant tout appel reseau (validation locale inscription).
  it('devrait refuser une inscription si le mot de passe est trop court', () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    component.signupForm.nom = 'Nom';
    component.signupForm.prenom = 'Prenom';
    component.signupForm.mail = 'a@b.c';
    component.signupForm.pseudo = 'pseudo';
    component.signupForm.password = 'short';
    component.onSignupSubmit();
    expect(component.errorMessage()).toContain('mot de passe');
  });

  // Verifie que la vue mot de passe oubliee remplace la vue principale (changement d etat UI).
  it('devrait passer a la vue mot de passe oublie lorsque openForgotView est appele', () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    component.openForgotView();
    expect(component.activeView()).toBe('forgot');
  });
});
