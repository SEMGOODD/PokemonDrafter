import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CombatApiService } from '../../../core/api/combat-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserApiService, UserSearchResult } from '../../../core/api/user-api.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { Battle, BattleMode } from '../../../shared/types/combat.types';
import { APP_ENV } from '../../../core/env/app-env';

@Component({
  selector: 'app-battle-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink, FormsModule],
  template: `
    <app-page-frame>
      <div class="create">
        <div class="create__header">
          <a routerLink="/combat" class="create__back">← Retour</a>
          <h1 class="create__title">Nouveau combat</h1>
        </div>

        <section class="create__section">
          <label class="create__label">Adversaire</label>
          <div class="create__search-row">
            <input
              class="create__input"
              type="text"
              placeholder="Nom d'utilisateur…"
              [(ngModel)]="opponentUsername"
              (keydown.enter)="searchOpponent()"
            />
            <button class="create__btn" (click)="searchOpponent()" [disabled]="searching()">
              {{ searching() ? '…' : 'Chercher' }}
            </button>
          </div>

          @if (searchError()) {
            <p class="create__error">{{ searchError() }}</p>
          }
          @if (opponent()) {
            <div class="create__opponent">
              <span class="create__opponent-icon">👤</span>
              <span>{{ opponent()!.username }}</span>
              <span class="create__opponent-id">{{ opponent()!.id.slice(0, 8) }}…</span>
            </div>
          }
        </section>

        <section class="create__section">
          <label class="create__label">Mode de jeu</label>
          <div class="create__modes">
            @for (m of modes; track m.value) {
              <button
                class="create__mode-btn"
                [class.create__mode-btn--active]="selectedMode() === m.value"
                (click)="selectedMode.set(m.value)"
              >
                <span class="create__mode-name">{{ m.label }}</span>
                <span class="create__mode-desc">{{ m.description }}</span>
              </button>
            }
          </div>
        </section>

        @if (createError()) {
          <p class="create__error">{{ createError() }}</p>
        }

        <button
          class="create__submit"
          (click)="createBattle()"
          [disabled]="!opponent() || creating()"
        >
          {{ creating() ? 'Création…' : 'Lancer le combat' }}
        </button>
      </div>
    </app-page-frame>
  `,
  styles: [`
    .create {
      max-width: 32rem;
      margin: 2rem auto 0;
      padding: 0 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .create__header { display: flex; align-items: center; gap: 1rem; }
    .create__back { color: #666; text-decoration: none; font-size: 0.9rem; }
    .create__back:hover { color: #111; }
    .create__title { font-size: 1.75rem; font-weight: 800; margin: 0; }
    .create__section { display: flex; flex-direction: column; gap: 0.5rem; }
    .create__label { font-weight: 600; font-size: 0.9rem; color: #444; text-transform: uppercase; letter-spacing: 0.05em; }
    .create__search-row { display: flex; gap: 0.5rem; }
    .create__input {
      flex: 1;
      padding: 0.625rem 0.875rem;
      border: 1px solid #ddd;
      border-radius: 0.375rem;
      font-size: 1rem;
      font-family: inherit;
    }
    .create__input:focus { outline: 2px solid #111; border-color: transparent; }
    .create__btn {
      padding: 0.625rem 1rem;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 600;
      font-family: inherit;
    }
    .create__btn:hover:not(:disabled) { background: #333; }
    .create__btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .create__error { color: #dc2626; font-size: 0.9rem; margin: 0; }
    .create__opponent {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 0.5rem;
    }
    .create__opponent-icon { font-size: 1.25rem; }
    .create__opponent-id { margin-left: auto; color: #aaa; font-family: monospace; font-size: 0.8rem; }
    .create__modes { display: flex; flex-direction: column; gap: 0.5rem; }
    .create__mode-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e5e5;
      border-radius: 0.5rem;
      background: #fff;
      cursor: pointer;
      text-align: left;
      transition: border-color 120ms;
    }
    .create__mode-btn:hover { border-color: #aaa; }
    .create__mode-btn--active { border-color: #111; }
    .create__mode-name { font-weight: 700; }
    .create__mode-desc { font-size: 0.85rem; color: #666; }
    .create__submit {
      padding: 0.875rem 2rem;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 999px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: background 120ms;
    }
    .create__submit:hover:not(:disabled) { background: #333; }
    .create__submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class BattleCreateComponent {
  private readonly api = inject(CombatApiService);
  private readonly userApi = inject(UserApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  opponentUsername = '';
  readonly opponent = signal<UserSearchResult | null>(null);
  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly selectedMode = signal<BattleMode>('DRAFT');
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  private readonly env = inject(APP_ENV);

  readonly modes: { value: BattleMode; label: string; description: string }[] = [
    { value: 'DRAFT', label: 'Draft', description: 'Choisissez vos Pokémon dans un pool commun.' },
    { value: 'RANDOM', label: 'Aléatoire', description: 'Équipes générées aléatoirement.' }
  ];

  searchOpponent(): void {
    const name = this.opponentUsername.trim();
    if (!name) return;
    this.searching.set(true);
    this.searchError.set(null);
    this.opponent.set(null);

    this.userApi.searchByUsername(name).subscribe({
      next: (user: UserSearchResult) => {
        this.opponent.set(user);
        this.searching.set(false);
      },
      error: (err: { status: number }) => {
        this.searchError.set(err.status === 404 ? 'Utilisateur introuvable.' : 'Erreur lors de la recherche.');
        this.searching.set(false);
      }
    });
  }

  createBattle(): void {
    const opp = this.opponent();
    if (!opp) { this.createError.set('Aucun adversaire sélectionné.'); return; }

    const myId = this.auth.getPlayerId();
    if (!myId) { this.createError.set('Token invalide ou expiré — reconnectez-vous.'); return; }
    const myColor = this.env.COLOR;

    this.creating.set(true);
    this.createError.set(null);

    this.api.createBattle({
      redPlayerId: myColor === 'red' ? myId : opp.username,
      bluePlayerId: myColor === 'red' ? opp.username : myId,
      mode: this.selectedMode(),
      redTeam: [],
      blueTeam: []
    }).subscribe({
      next: (battle: Battle) => this.router.navigate(['/combat/battle', battle.battleId]),
      error: (err: { error?: { error?: string } }) => {
        this.createError.set(err.error?.error ?? 'Impossible de créer le combat.');
        this.creating.set(false);
      }
    });
  }
}
