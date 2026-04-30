import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { APP_ENV, AppEnv } from '../../core/env/app-env';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { createThemeServiceTestDouble } from '../../../testing/theme-service-test-double';
import { DashboardComponent } from './dashboard.component';

const MOCK_FRONT_RED = 'http://red.test';
const MOCK_FRONT_BLUE = 'http://blue.test';

const mockAppEnv: AppEnv = {
  COLOR: 'neutral',
  GATEWAY_URL: 'http://gateway.test',
  KEYCLOAK_URL: 'http://kc.test',
  KEYCLOAK_REALM: 'realm',
  KEYCLOAK_CLIENT_ID: 'client',
  FRONT_RED_URL: MOCK_FRONT_RED,
  FRONT_BLUE_URL: MOCK_FRONT_BLUE
};

function encodeJwtSegment(payload: object): string {
  const utf8Bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  utf8Bytes.forEach(b => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function buildAccessTokenJwt(payload: object): string {
  const header = encodeJwtSegment({ alg: 'none', typ: 'JWT' });
  const body = encodeJwtSegment(payload);
  return `${header}.${body}.x`;
}

describe('DashboardComponent', () => {
  const tokenSubject = new BehaviorSubject<string | null>(null);
  const logoutSpy = jasmine.createSpy('logout');

  beforeEach(async () => {
    tokenSubject.next(null);
    logoutSpy.calls.reset();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useFactory: createThemeServiceTestDouble },
        { provide: APP_ENV, useValue: mockAppEnv },
        {
          provide: AuthService,
          useValue: {
            token$: tokenSubject.asObservable(),
            getToken: (): string | null => tokenSubject.value,
            logout: logoutSpy
          }
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
        }
      ]
    }).compileComponents();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Verifie que le tableau de bord se monte avec les dependances injectees (smoke integration).
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le pseudo affiche la valeur du jeton decode (liaison profil JWT).
  it('devrait afficher le preferred_username du jeton dans le titre', async () => {
    const token = buildAccessTokenJwt({
      preferred_username: 'ash_ketchum',
      realm_access: { roles: ['red_player'] }
    });
    tokenSubject.next(token);
    localStorage.setItem('access_token', token);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('ash_ketchum');
  });

  // Verifie que le lien vers le front colore inclut le jeton pour le SSO vers l espace joueur.
  it('devrait construire le lien front rouge avec le jeton encode', async () => {
    const token = buildAccessTokenJwt({
      preferred_username: 'r1',
      realm_access: { roles: ['red_player'] }
    });
    tokenSubject.next(token);
    localStorage.setItem('access_token', token);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const anchor = (fixture.nativeElement as HTMLElement).querySelector('a.dashboard__cta');
    expect(anchor?.getAttribute('href')).toContain(MOCK_FRONT_RED);
    expect(anchor?.getAttribute('href')).toContain(encodeURIComponent(token));
  });

  // Verifie que le clic deconnexion delegue au service d authentification (point unique de sortie de session).
  it('devrait appeler logout du AuthService lors du clic deconnexion', async () => {
    const token = buildAccessTokenJwt({
      preferred_username: 'r1',
      realm_access: { roles: ['red_player'] }
    });
    tokenSubject.next(token);
    localStorage.setItem('access_token', token);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button.dashboard__logout'
    ) as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    button!.click();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
