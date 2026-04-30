import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/theme/theme.service';
import { PokeballButtonComponent } from '../pokeball/pokeball-button.component';
import { AuthService } from '../../../core/auth/auth.service';
import { PlayerApiService } from '../../../core/api/player-api.service';
import { APP_ENV } from '../../../core/env/app-env';

@Component({
  selector: 'app-page-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PokeballButtonComponent, RouterLink],
  template: `
    <div class="page-frame">
      <header class="page-frame__header">
        @if (isNeutral()) {
          <div class="page-frame__stripe-neutral"></div>
        } @else {
          <div class="page-frame__stripe-themed"></div>
          <div class="page-frame__separator"></div>
        }
        <div class="page-frame__pokeball">
          <app-pokeball-button/>
        </div>
        @if (auth.isLoggedIn()) {
        <div class="page-frame__user">
          <button class="page-frame__user-btn" (click)="toggleMenu()">
            {{ playerId() ?? '…' }} ▾
          </button>
          @if (menuOpen()) {
          <div class="page-frame__submenu">
            <button class="page-frame__submenu-item" (click)="changePseudo()">Changer mon pseudo</button>
            <button class="page-frame__submenu-item" (click)="changeColor()">Changer de couleur</button>
            <a routerLink="/combat" class="page-frame__submenu-item" (click)="menuOpen.set(false)">Historique des parties</a>
            <button class="page-frame__submenu-item page-frame__submenu-item--danger" (click)="logout()">Déconnexion</button>
          </div>
          }
        </div>
        }
      </header>
      <main class="page-frame__content">
        <ng-content/>
      </main>
    </div>
  `,
  styleUrl: './page-frame.component.scss'
})
export class PageFrameComponent {
  private readonly themeService = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  private readonly playerApi = inject(PlayerApiService);
  private readonly router = inject(Router);
  private readonly env = inject(APP_ENV);

  readonly isNeutral = computed(() => this.themeService.theme() === 'neutral');
  readonly menuOpen = signal(false);
  readonly playerId = signal<string | null>(null);

  constructor() {
    this.playerId.set(this.auth.getPlayerId());
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  changePseudo(): void {
    this.menuOpen.set(false);
    const keycloakAccountUrl = `${this.env.KEYCLOAK_URL}/realms/${this.env.KEYCLOAK_REALM}/account`;
    window.open(keycloakAccountUrl, '_blank');
  }

  changeColor(): void {
    this.menuOpen.set(false);
    const newColor = this.env.COLOR === 'red' ? 'blue' : 'red';
    if (!confirm(`Changer vers l'équipe ${newColor === 'red' ? 'Rouge' : 'Bleue'} ? Tu seras redirigé vers le bon frontend.`)) return;

    this.playerApi.changeColor({ color: newColor }).subscribe({
      next: () => {
        localStorage.removeItem('access_token');
        window.location.href = this.env.FRONT_GENERAL_URL;
      },
      error: () => alert('Erreur lors du changement de couleur.')
    });
  }

  logout(): void {
    this.menuOpen.set(false);
    localStorage.removeItem('access_token');
    window.location.href = this.env.FRONT_GENERAL_URL;
  }
}