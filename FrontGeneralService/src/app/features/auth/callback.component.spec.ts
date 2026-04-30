import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';

import { APP_ENV, AppEnv } from '../../core/env/app-env';
import { ThemeService } from '../../core/theme/theme.service';
import { createThemeServiceTestDouble } from '../../../testing/theme-service-test-double';
import { CallbackComponent } from './callback.component';

const MOCK_KEYCLOAK_URL = 'http://test.local:8080';
const MOCK_REALM = 'test-realm';
const MOCK_CLIENT_ID = 'test-client';
const TOKEN_PATH = '/protocol/openid-connect/token';

const mockAppEnv: AppEnv = {
  COLOR: 'neutral',
  GATEWAY_URL: 'http://test.local:8000',
  KEYCLOAK_URL: MOCK_KEYCLOAK_URL,
  KEYCLOAK_REALM: MOCK_REALM,
  KEYCLOAK_CLIENT_ID: MOCK_CLIENT_ID,
  FRONT_RED_URL: 'http://red.local',
  FRONT_BLUE_URL: 'http://blue.local'
};

function keycloakTokenUrl(): string {
  return `${MOCK_KEYCLOAK_URL}/realms/${MOCK_REALM}${TOKEN_PATH}`;
}

describe('CallbackComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('sans code OAuth', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [CallbackComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: mockAppEnv },
        { provide: ThemeService, useFactory: createThemeServiceTestDouble },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
          }
        ]
      }).compileComponents();
    });

    afterEach(() => {
      TestBed.inject(HttpTestingController).verify();
      localStorage.clear();
    });

    // Verifie que l absence de code OAuth renvoie immediatement vers la page d authentification (evite requete vide).
    it('devrait rediriger vers /auth si aucun code dans la query', () => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');
      const fixture = TestBed.createComponent(CallbackComponent);
      fixture.detectChanges();
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });

  describe('avec code OAuth', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [CallbackComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: mockAppEnv },
        { provide: ThemeService, useFactory: createThemeServiceTestDouble },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({ code: 'auth-code-xyz' }) } }
          }
        ]
      }).compileComponents();
    });

    afterEach(() => {
      TestBed.inject(HttpTestingController).verify();
      localStorage.clear();
    });

    // Verifie qu un code present declenche l echange de jeton puis la redirection dashboard (flux OAuth code).
    it('devrait echanger le code puis rediriger vers le dashboard', () => {
      const router = TestBed.inject(Router);
      const httpMock = TestBed.inject(HttpTestingController);
      spyOn(router, 'navigate');
      const fixture = TestBed.createComponent(CallbackComponent);
      fixture.detectChanges();
      const request = httpMock.expectOne(keycloakTokenUrl());
      expect(request.request.method).toBe('POST');
      request.flush({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 300
      });
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
