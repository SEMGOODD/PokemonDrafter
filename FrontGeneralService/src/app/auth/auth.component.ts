import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

type AuthTab = 'login' | 'register';
type AuthView = 'form' | 'forgot';

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './auth.component.html',
    styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
    activeTab: AuthTab = 'login';
    activeView: AuthView = 'form';

    loginForm = { username: '', password: '' };
    forgotEmail = '';

    errorMessage = '';
    successMessage = '';
    loading = false;

    constructor(public authService: AuthService, private router: Router) { }

    switchTab(tab: AuthTab) {
        this.activeTab = tab;
        this.errorMessage = '';
        this.successMessage = '';
        if (tab === 'register') {
            this.authService.redirectToKeycloakRegister();
        }
    }

    onLogin() {
        if (!this.loginForm.username || !this.loginForm.password) {
            this.errorMessage = 'Please fill in all fields.';
            return;
        }
        this.loading = true;
        this.errorMessage = '';
        this.authService.login(this.loginForm.username, this.loginForm.password)
            .subscribe({
                next: (res) => {
                    this.authService.saveToken(res.access_token);
                    this.router.navigate(['/dashboard']);
                },
                error: () => {
                    this.errorMessage = 'Invalid username or password.';
                    this.loading = false;
                }
            });
    }

    onSSORedirect() {
        this.authService.redirectToKeycloak();
    }

    onForgotSubmit() {
        if (!this.forgotEmail) {
            this.errorMessage = 'Please enter your email.';
            return;
        }
        this.authService.redirectToKeycloakForgotPassword();
    }
}