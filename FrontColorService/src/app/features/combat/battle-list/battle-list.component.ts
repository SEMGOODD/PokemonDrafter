import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CombatApiService } from '../../../core/api/combat-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { Battle } from '../../../shared/types/combat.types';

const POLL_INTERVAL_MS = 5000;

@Component({
  selector: 'app-battle-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink],
  template: `
    <app-page-frame>
      <div class="battle-list">
        <div class="battle-list__header">
          <h1 class="battle-list__title">Mes combats</h1>
          <a routerLink="/combat/new" class="battle-list__new">+ Nouveau combat</a>
        </div>

        @if (activeBattles().length > 0) {
          <section>
            <h2 class="battle-list__section-title">En cours</h2>
            <div class="battle-list__grid">
              @for (b of activeBattles(); track b.battleId) {
                <a class="battle-card battle-card--active" [routerLink]="['/combat/battle', b.battleId]">
                  <span class="battle-card__mode">{{ b.mode }}</span>
                  <span class="battle-card__status">{{ statusLabel(b.status) }}</span>
                  <span class="battle-card__id">{{ b.battleId.slice(0, 8) }}…</span>
                </a>
              }
            </div>
          </section>
        }

        @if (finishedBattles().length > 0) {
          <section>
            <h2 class="battle-list__section-title">Terminés</h2>
            <div class="battle-list__grid">
              @for (b of finishedBattles(); track b.battleId) {
                <a class="battle-card" [routerLink]="['/combat/battle', b.battleId]">
                  <span class="battle-card__mode">{{ b.mode }}</span>
                  <span class="battle-card__result" [class.battle-card__result--win]="isWinner(b)">
                    {{ isWinner(b) ? 'Victoire' : 'Défaite' }}
                  </span>
                  <span class="battle-card__id">{{ b.battleId.slice(0, 8) }}…</span>
                </a>
              }
            </div>
          </section>
        }

        @if (activeBattles().length === 0 && finishedBattles().length === 0 && !loading()) {
          <p class="battle-list__empty">Aucun combat pour l'instant. Lance ton premier duel !</p>
        }
      </div>
    </app-page-frame>
  `,
  styles: [`
    .battle-list {
      max-width: 40rem;
      margin: 2rem auto 0;
      padding: 0 1rem;
    }
    .battle-list__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .battle-list__title {
      font-size: 1.75rem;
      font-weight: 800;
      margin: 0;
    }
    .battle-list__new {
      padding: 0.5rem 1.25rem;
      background: #111;
      color: #fff;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .battle-list__new:hover { background: #333; }
    .battle-list__section-title {
      font-size: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #888;
      margin: 0 0 0.75rem;
    }
    .battle-list__grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .battle-list__empty {
      text-align: center;
      color: #888;
      margin-top: 3rem;
    }
    .battle-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border: 1px solid #e5e5e5;
      border-radius: 0.5rem;
      text-decoration: none;
      color: inherit;
      transition: border-color 120ms ease;
    }
    .battle-card:hover { border-color: #111; }
    .battle-card--active { border-color: #f59e0b; }
    .battle-card__mode {
      font-weight: 700;
      font-size: 0.85rem;
      background: #f0f0f0;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .battle-card__status { color: #666; font-size: 0.9rem; }
    .battle-card__result { font-weight: 700; color: #dc2626; }
    .battle-card__result--win { color: #16a34a; }
    .battle-card__id { margin-left: auto; color: #aaa; font-size: 0.8rem; font-family: monospace; }
  `]
})
export class BattleListComponent implements OnInit, OnDestroy {
  private readonly api = inject(CombatApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly activeBattles = signal<Battle[]>([]);
  readonly finishedBattles = signal<Battle[]>([]);
  readonly loading = signal(true);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.load();
    this.pollTimer = setInterval(() => this.load(), POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private load(): void {
    this.api.getActiveBattles().subscribe({
      next: battles => {
        this.activeBattles.set(battles);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.loading.set(false)
    });

    this.api.getMyBattles().subscribe({
      next: battles => {
        this.finishedBattles.set(battles);
        this.cdr.markForCheck();
      }
    });
  }

  isWinner(battle: Battle): boolean {
    return battle.winnerId === this.auth.getPlayerId();
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT_PHASE: 'Phase de draft',
      IN_PROGRESS: 'En cours',
      FINISHED: 'Terminé'
    };
    return labels[status] ?? status;
  }
}
