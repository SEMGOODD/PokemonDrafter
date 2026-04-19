import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly KEYCLOAK_URL = 'http://localhost:8080';
    private readonly REALM = 'pokemon-drafter';
    private readonly CLIENT_ID = 'frontend-client';
    private readonly REDIRECT_URI = 'http://localhost:4200/callback';

    private tokenSubject = new BehaviorSubject<string | null>(
        localStorage.getItem('access_token')
    );
    token$ = this.tokenSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) { }

    redirectToKeycloakRegister(): void {
        const params = new URLSearchParams({
            client_id: this.CLIENT_ID,
            redirect_uri: this.REDIRECT_URI,
            response_type: 'code',
            scope: 'openid profile email roles',
            action: 'register',
        });
        window.location.href =
            `${this.KEYCLOAK_URL}/realms/${this.REALM}/protocol/openid-connect/auth?${params}`;
    }
    redirectToKeycloakForgotPassword(): void {
        const params = new URLSearchParams({
            client_id: this.CLIENT_ID,
            redirect_uri: this.REDIRECT_URI,
            response_type: 'code',
            scope: 'openid profile email roles',
            action: 'reset_credentials',  // ← Keycloak's built-in reset flow
        });
        window.location.href =
            `${this.KEYCLOAK_URL}/realms/${this.REALM}/protocol/openid-connect/auth?${params}`;
    }

    // Direct username/password login
    login(username: string, password: string): Observable<TokenResponse> {
        const body = new HttpParams()
            .set('grant_type', 'password')
            .set('client_id', this.CLIENT_ID)
            .set('username', username)
            .set('password', password);

        return this.http.post<TokenResponse>(
            `${this.KEYCLOAK_URL}/realms/${this.REALM}/protocol/openid-connect/token`,
            body.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
    }

    // Authorization Code Flow
    redirectToKeycloak(): void {
        const params = new URLSearchParams({
            client_id: this.CLIENT_ID,
            redirect_uri: this.REDIRECT_URI,
            response_type: 'code',
            scope: 'openid profile email roles',
        });
        window.location.href =
            `${this.KEYCLOAK_URL}/realms/${this.REALM}/protocol/openid-connect/auth?${params}`;
    }

    // Exchange code for token after redirect callback
    handleCallback(code: string): Observable<TokenResponse> {
        const body = new HttpParams()
            .set('grant_type', 'authorization_code')
            .set('client_id', this.CLIENT_ID)
            .set('code', code)
            .set('redirect_uri', this.REDIRECT_URI);

        return this.http.post<TokenResponse>(
            `${this.KEYCLOAK_URL}/realms/${this.REALM}/protocol/openid-connect/token`,
            body.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
    }

    saveToken(token: string): void {
        localStorage.setItem('access_token', token);
        this.tokenSubject.next(token);
    }

    logout(): void {
        localStorage.removeItem('access_token');
        this.tokenSubject.next(null);
        this.router.navigate(['/auth']);
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('access_token');
    }
}