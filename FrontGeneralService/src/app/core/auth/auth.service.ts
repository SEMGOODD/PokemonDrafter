import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

import { APP_ENV } from '../env/app-env';
import { ThemeService } from '../theme/theme.service';

const STORAGE_KEY_ACCESS_TOKEN = 'access_token';
const STORAGE_KEY_REFRESH_TOKEN = 'refresh_token';
const KEYCLOAK_TOKEN_PATH = '/protocol/openid-connect/token';
const KEYCLOAK_AUTH_PATH = '/protocol/openid-connect/auth';
const OAUTH_SCOPE = 'openid profile email roles';
const CALLBACK_PATH = '/callback';
const AUTH_ROUTE = '/auth';
const SIGNUP_PATH = '/api/auth/signup';
const FORGOT_PASSWORD_PATH = '/api/auth/forgot-password';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface SignupRequest {
  nom: string;
  prenom: string;
  mail: string;
  pseudo: string;
  password: string;
  couleur: 'red' | 'blue';
}

export interface SignupResponse {
  userId: string;
  couleur: 'red' | 'blue';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly env = inject(APP_ENV);
  private readonly themeService = inject(ThemeService);

  private readonly tokenSubject = new BehaviorSubject<string | null>(
    localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN)
  );
  readonly token$ = this.tokenSubject.asObservable();

  signup(request: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(
      `${this.env.GATEWAY_URL}${SIGNUP_PATH}`,
      request
    );
  }

  requestPasswordReset(mail: string): Observable<void> {
    return this.http.post<void>(
      `${this.env.GATEWAY_URL}${FORGOT_PASSWORD_PATH}`,
      { mail }
    );
  }

  login(username: string, password: string): Observable<TokenResponse> {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', this.env.KEYCLOAK_CLIENT_ID)
      .set('username', username)
      .set('password', password);

    return this.http.post<TokenResponse>(
      this.tokenEndpoint(),
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  redirectToKeycloakLogin(): void {
    window.location.href = this.authUrlWithParams({});
  }

  redirectToKeycloakRegister(): void {
    window.location.href = this.authUrlWithParams({ action: 'register' });
  }


  handleCallback(code: string): Observable<TokenResponse> {
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', this.env.KEYCLOAK_CLIENT_ID)
      .set('code', code)
      .set('redirect_uri', this.redirectUri());

    return this.http.post<TokenResponse>(
      this.tokenEndpoint(),
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  saveToken(token: string, refreshToken?: string): void {
    localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, token);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
    }
    this.tokenSubject.next(token);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
    this.tokenSubject.next(null);
    this.themeService.setUserColor(null);
    this.router.navigate([AUTH_ROUTE]);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
  }

  private tokenEndpoint(): string {
    return `${this.env.KEYCLOAK_URL}/realms/${this.env.KEYCLOAK_REALM}${KEYCLOAK_TOKEN_PATH}`;
  }

  private authEndpoint(): string {
    return `${this.env.KEYCLOAK_URL}/realms/${this.env.KEYCLOAK_REALM}${KEYCLOAK_AUTH_PATH}`;
  }

  private redirectUri(): string {
    return `${window.location.origin}${CALLBACK_PATH}`;
  }

  private authUrlWithParams(extra: Record<string, string>): string {
    const params = new URLSearchParams({
      client_id: this.env.KEYCLOAK_CLIENT_ID,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: OAUTH_SCOPE,
      ...extra
    });
    return `${this.authEndpoint()}?${params.toString()}`;
  }
}
