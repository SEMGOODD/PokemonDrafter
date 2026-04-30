import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_ENV, AppEnv } from '../../../core/env/app-env';
import { ThemeService } from '../../../core/theme/theme.service';
import { createThemeServiceTestDouble } from '../../../../testing/theme-service-test-double';
import { AdminLogsComponent } from './admin-logs.component';

const MOCK_GATEWAY = 'http://gateway.test';

const mockAppEnv: AppEnv = {
  COLOR: 'neutral',
  GATEWAY_URL: MOCK_GATEWAY,
  KEYCLOAK_URL: 'http://kc.test',
  KEYCLOAK_REALM: 'realm',
  KEYCLOAK_CLIENT_ID: 'client',
  FRONT_RED_URL: 'http://red',
  FRONT_BLUE_URL: 'http://blue'
};

describe('AdminLogsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLogsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENV, useValue: mockAppEnv },
        { provide: ThemeService, useFactory: createThemeServiceTestDouble }
      ]
    }).compileComponents();
  });

  function flushLogsSearchRequest(httpMock: HttpTestingController): void {
    const searchRequest = httpMock.expectOne(
      req => req.url.startsWith(`${MOCK_GATEWAY}/api/logs`) && !req.url.includes('/services')
    );
    searchRequest.flush([]);
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  // Verifie que la console admin se cree avec les formulaires reactifs et le service HTTP injecte.
  it('devrait instancier le composant', fakeAsync(() => {
    const fixture = TestBed.createComponent(AdminLogsComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${MOCK_GATEWAY}/api/logs/services`).flush([]);
    tick(300);
    flushLogsSearchRequest(httpMock);
    expect(fixture.componentInstance).toBeTruthy();
    fixture.destroy();
  }));

  // Verifie que la liste des services est chargee au demarrage (alimentation du select de filtre).
  it('devrait appeler listServices au montage', fakeAsync(() => {
    const fixture = TestBed.createComponent(AdminLogsComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const listRequest = httpMock.expectOne(`${MOCK_GATEWAY}/api/logs/services`);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush(['pokemon-service']);
    tick(300);
    flushLogsSearchRequest(httpMock);
    fixture.destroy();
  }));

  // Verifie qu une recherche de logs est declenchee apres le debounce des filtres (requete agregee).
  it('devrait lancer une recherche apres le debounce initial', fakeAsync(() => {
    const fixture = TestBed.createComponent(AdminLogsComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${MOCK_GATEWAY}/api/logs/services`).flush([]);
    tick(300);
    const searchRequest = httpMock.expectOne(
      req => req.url.startsWith(`${MOCK_GATEWAY}/api/logs`) && !req.url.includes('/services')
    );
    expect(searchRequest.request.method).toBe('GET');
    searchRequest.flush([]);
    fixture.destroy();
  }));
});
