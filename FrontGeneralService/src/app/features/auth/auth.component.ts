import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { PageFrameComponent } from '../../shared/ui/page-frame/page-frame.component';

const DASHBOARD_ROUTE = '/dashboard';
const INVALID_CREDENTIALS_MESSAGE = 'Identifiants incorrects.';
const MISSING_FIELDS_MESSAGE = 'Merci de renseigner tous les champs.';
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_TOO_SHORT_MESSAGE = `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caracteres.`;
const SIGNUP_CONFLICT_MESSAGE = 'Ce pseudo ou cet email est deja utilise.';
const SIGNUP_FAILED_MESSAGE = 'L\'inscription a echoue. Reessaye plus tard.';
const FORGOT_SENT_MESSAGE = 'Si un compte correspond a cet email, un lien de reinitialisation vient d\'etre envoye.';
const HTTP_CONFLICT = 409;

type AuthTab = 'login' | 'register';
type AuthView = 'main' | 'forgot';

@Component({
  selector: 'app-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageFrameComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly activeTab = signal<AuthTab>('login');
  readonly activeView = signal<AuthView>('main');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  loginForm = { username: '', password: '' };
  signupForm = {
    nom: '',
    prenom: '',
    mail: '',
    pseudo: '',
    password: '',
    couleur: 'red' as 'red' | 'blue'
  };
  forgotForm = { mail: '' };

  setTab(tab: AuthTab): void {
    this.activeTab.set(tab);
    this.clearFeedback();
  }

  openForgotView(): void {
    this.activeView.set('forgot');
    this.clearFeedback();
  }

  openMainView(): void {
    this.activeView.set('main');
    this.clearFeedback();
  }

  onLoginSubmit(): void {
    const username = this.loginForm.username.trim();
    const password = this.loginForm.password;
    if (!username || !password) {
      this.errorMessage.set(MISSING_FIELDS_MESSAGE);
      return;
    }
    this.loading.set(true);
    this.clearFeedback();
    this.authService.login(username, password).subscribe({
      next: res => {
        this.authService.saveToken(res.access_token, res.refresh_token);
        this.router.navigate([DASHBOARD_ROUTE]);
      },
      error: () => {
        this.errorMessage.set(INVALID_CREDENTIALS_MESSAGE);
        this.loading.set(false);
      }
    });
  }

  onSignupSubmit(): void {
    const form = this.signupForm;
    const trimmedNom = form.nom.trim();
    const trimmedPrenom = form.prenom.trim();
    const trimmedMail = form.mail.trim();
    const trimmedPseudo = form.pseudo.trim();
    if (!trimmedNom || !trimmedPrenom || !trimmedMail || !trimmedPseudo || !form.password) {
      this.errorMessage.set(MISSING_FIELDS_MESSAGE);
      return;
    }
    if (form.password.length < PASSWORD_MIN_LENGTH) {
      this.errorMessage.set(PASSWORD_TOO_SHORT_MESSAGE);
      return;
    }
    this.loading.set(true);
    this.clearFeedback();
    this.authService.signup({
      nom: trimmedNom,
      prenom: trimmedPrenom,
      mail: trimmedMail,
      pseudo: trimmedPseudo,
      password: form.password,
      couleur: form.couleur
    }).subscribe({
      next: () => this.autoLoginAfterSignup(trimmedPseudo, form.password),
      error: err => this.handleSignupError(err)
    });
  }

  onForgotSubmit(): void {
    const mail = this.forgotForm.mail.trim();
    if (!mail) {
      this.errorMessage.set(MISSING_FIELDS_MESSAGE);
      return;
    }
    this.loading.set(true);
    this.clearFeedback();
    this.authService.requestPasswordReset(mail).subscribe({
      next: () => this.handleForgotSuccess(),
      error: () => this.handleForgotSuccess()
    });
  }

  private handleForgotSuccess(): void {
    this.successMessage.set(FORGOT_SENT_MESSAGE);
    this.loading.set(false);
    this.forgotForm.mail = '';
  }

  private handleSignupError(err: unknown): void {
    console.error('Signup failed', err);
    const statusCode = (err as { status?: number })?.status;
    const innerStatus = (err as { error?: { status?: number } })?.error?.status;
    const isConflict = statusCode === HTTP_CONFLICT || innerStatus === HTTP_CONFLICT;
    this.errorMessage.set(isConflict ? SIGNUP_CONFLICT_MESSAGE : SIGNUP_FAILED_MESSAGE);
    this.loading.set(false);
  }

  private autoLoginAfterSignup(pseudo: string, password: string): void {
    this.authService.login(pseudo, password).subscribe({
      next: res => {
        this.authService.saveToken(res.access_token, res.refresh_token);
        this.router.navigate([DASHBOARD_ROUTE]);
      },
      error: () => {
        this.errorMessage.set('Compte cree. Connecte-toi manuellement depuis l\'onglet Connexion.');
        this.setTab('login');
        this.loginForm.username = pseudo;
        this.loading.set(false);
      }
    });
  }

  private clearFeedback(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
