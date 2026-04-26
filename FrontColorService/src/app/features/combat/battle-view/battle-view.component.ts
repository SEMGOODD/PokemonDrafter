import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CombatApiService } from '../../../core/api/combat-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { ActionType, Battle, BattlePokemon } from '../../../shared/types/combat.types';

const DRAFT_ORDER: [number, number][] = [
  [0, 1], [1, 2], [0, 1], [1, 1], [0, 1],
  [1, 1], [0, 1], [1, 1], [0, 1], [1, 1], [0, 1]
];

const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, psychic: 0.5 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0, ice: 1, dragon: 1 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0, ghost: 1 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5, normal: 0, steel: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }
};

const POLL_INTERVAL_MS = 3000;

@Component({
  selector: 'app-battle-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink],
  template: `
    <app-page-frame>
      <div class="view">
        <div class="view__header">
          <a routerLink="/combat" class="view__back">← Mes combats</a>
          @if (battle()) {
            <span class="view__status">{{ statusLabel(battle()!.status) }}</span>
          }
        </div>

        @if (error()) {
          <p class="view__error">{{ error() }}</p>
        }

        @if (battle(); as b) {

          <!-- DRAFT PHASE -->
          @if (b.status === 'DRAFT_PHASE') {
            <div class="draft">
              <h2 class="draft__title">Phase de draft</h2>
              <p class="draft__turn">
                @if (isMyDraftTurn(b)) {
                  C'est ton tour ! Choisir <strong>{{ draftPickCount(b) }}</strong> Pokémon.
                } @else {
                  En attente du choix adverse…
                }
              </p>
              <div class="draft__grid">
                @for (p of b.draftPool; track p.id) {
                  <button
                    class="pokemon-card"
                    [class.pokemon-card--selected]="isDraftSelected(p.id)"
                    [class.pokemon-card--recommended]="isRecommended(p.id)"
                    [class.pokemon-card--disabled]="!isMyDraftTurn(b)"
                    [disabled]="!isMyDraftTurn(b)"
                    (click)="toggleDraftPick(b, p)"
                  >
                    <img [src]="p.sprite" [alt]="p.name" class="pokemon-card__sprite" />
                    <span class="pokemon-card__name">{{ p.name }}</span>
                    <div class="pokemon-card__types">
                      @for (t of p.types; track t) {
                        <span class="type-badge type-badge--{{ t }}">{{ t }}</span>
                      }
                    </div>
                    @if (isRecommended(p.id)) {
                      <span class="pokemon-card__hint">Recommandé</span>
                    }
                  </button>
                }
              </div>
              @if (isMyDraftTurn(b)) {
                <div class="draft__actions-row">
                  <button
                    class="view__secondary-btn"
                    (click)="recommendPokemon(b)"
                    [disabled]="submitting() || myTeam(b).length === 0"
                  >
                    Recommandations
                  </button>
                  <button
                    class="view__action-btn"
                    (click)="confirmDraft(b)"
                    [disabled]="draftSelection().length !== draftPickCount(b) || submitting()"
                  >
                    Confirmer ({{ draftSelection().length }}/{{ draftPickCount(b) }})
                  </button>
                </div>
              }
              @if (recommendations().length > 0) {
                <div class="draft__recommendation-panel">
                  <p class="draft__recommendation-title">Suggestions pour ton équipe</p>
                  <div class="recommendation-list">
                    @for (rec of recommendations(); track rec.id) {
                      <div class="recommendation-card">
                        <img [src]="rec.sprite" [alt]="rec.name" class="recommendation-card__sprite" />
                        <div>
                          <div class="recommendation-card__name">{{ rec.name }}</div>
                          <div class="recommendation-card__types">
                            @for (t of rec.types; track t) {
                              <span class="type-badge type-badge--{{ t }}">{{ t }}</span>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
              @if (actionError()) {
                <p class="view__error">{{ actionError() }}</p>
              }
            </div>
          }

          <!-- IN PROGRESS -->
          @if (b.status === 'IN_PROGRESS') {
            <div class="combat">
              <div class="combat__field">
                <div class="combat__side combat__side--opponent">
                  <p class="combat__label">Adversaire</p>
                  @if (opponentActive(b); as opp) {
                    <img [src]="opp.sprite" [alt]="opp.name" class="combat__sprite" />
                    <p class="combat__pokemon-name" [class.combat__pokemon-name--ko]="opp.ko">
                      {{ opp.name }} {{ opp.ko ? '(KO)' : '' }}
                    </p>
                  }
                </div>
                <div class="combat__side combat__side--mine">
                  <p class="combat__label">Ton Pokémon actif</p>
                  @if (myActive(b); as mine) {
                    <img [src]="mine.sprite" [alt]="mine.name" class="combat__sprite" />
                    <p class="combat__pokemon-name" [class.combat__pokemon-name--ko]="mine.ko">
                      {{ mine.name }} {{ mine.ko ? '(KO)' : '' }}
                    </p>
                  }
                </div>
              </div>

              @if (!hasActed(b)) {
                <div class="combat__actions">
                  <p class="combat__actions-title">Choisis ton action</p>
                  @if (!myActive(b)?.ko) {
                    <button class="view__action-btn" (click)="submitStay(b)" [disabled]="submitting()">
                      Rester
                    </button>
                  }
                  <div class="combat__switch-list">
                    @for (p of myTeam(b); track p.id) {
                      @if (!p.ko && p.id !== myActive(b)?.id) {
                        <button
                          class="pokemon-card pokemon-card--small"
                          (click)="submitSwitch(b, p)"
                          [disabled]="submitting()"
                        >
                          <img [src]="p.sprite" [alt]="p.name" class="pokemon-card__sprite" />
                          <span class="pokemon-card__name">{{ p.name }}</span>
                        </button>
                      }
                    }
                  </div>
                </div>
              } @else {
                <p class="combat__waiting">Action soumise, en attente de l'adversaire…</p>
              }

              @if (actionError()) {
                <p class="view__error">{{ actionError() }}</p>
              }

              <button class="view__forfeit-btn" (click)="confirmForfeit(b)" [disabled]="submitting()">
                Abandonner
              </button>
            </div>
          }

          <!-- FINISHED -->
          @if (b.status === 'FINISHED') {
            <div class="finished">
              @if (b.winnerId === myId()) {
                <p class="finished__result finished__result--win">🏆 Victoire !</p>
              } @else {
                <p class="finished__result finished__result--loss">Défaite…</p>
              }
              <p class="finished__turns">{{ b.turnHistory.length }} tour(s) joué(s)</p>
              @if (b.turnHistory.length > 0) {
                <div class="finished__history">
                  @for (t of b.turnHistory; track t.turnNumber) {
                    <div class="turn-row">
                      <span class="turn-row__num">Tour {{ t.turnNumber }}</span>
                      <span>{{ t.redPokemonName }} vs {{ t.bluePokemonName }}</span>
                      @if (t.redKo) { <span class="turn-row__ko">{{ t.redPokemonName }} KO</span> }
                      @if (t.blueKo) { <span class="turn-row__ko">{{ t.bluePokemonName }} KO</span> }
                    </div>
                  }
                </div>
              }
              <a routerLink="/combat" class="view__action-btn" style="text-decoration:none; text-align:center;">
                Retour à mes combats
              </a>
            </div>
          }
        }
      </div>
    </app-page-frame>
  `,
  styles: [`
    .view {
      max-width: 40rem;
      margin: 2rem auto 0;
      padding: 0 1rem;
    }
    .view__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .view__back { color: #666; text-decoration: none; font-size: 0.9rem; }
    .view__back:hover { color: #111; }
    .view__status {
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #888;
    }
    .view__error { color: #dc2626; margin: 0.5rem 0; }
    .view__action-btn {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 999px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      margin-top: 1rem;
    }
    .view__secondary-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      background: #f5f5f5;
      color: #111;
      border: 1px solid #ddd;
      border-radius: 999px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      margin-top: 1rem;
    }
    .view__secondary-btn:hover:not(:disabled) { background: #ececec; }
    .view__action-btn:hover:not(:disabled) { background: #333; }
    .view__action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .view__forfeit-btn {
      background: transparent;
      border: none;
      color: #dc2626;
      text-decoration: underline;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.9rem;
      margin-top: 1.5rem;
    }

    /* Draft */
    .draft__title { font-size: 1.5rem; font-weight: 800; margin: 0 0 0.5rem; }
    .draft__turn { margin: 0 0 1rem; color: #555; }
    .draft__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .draft__actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .draft__recommendation-panel {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .draft__recommendation-title {
      margin: 0 0 0.75rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #111;
    }
    .recommendation-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
      gap: 0.75rem;
    }
    .recommendation-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.9rem;
      background: #fff;
    }
    .recommendation-card__sprite {
      width: 50px;
      height: 50px;
      object-fit: contain;
    }
    .recommendation-card__name {
      font-weight: 700;
      text-transform: capitalize;
      margin-bottom: 0.25rem;
    }
    .recommendation-card__types { display: flex; gap: 0.25rem; flex-wrap: wrap; }
    .pokemon-card--recommended {
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.14);
    }
    .pokemon-card__hint {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 0.4rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: rgba(79, 70, 229, 0.1);
      color: #4f46e5;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Pokemon cards */
    .pokemon-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem;
      border: 2px solid #e5e5e5;
      border-radius: 0.5rem;
      background: #fff;
      cursor: pointer;
      transition: border-color 120ms;
    }
    .pokemon-card:hover:not(:disabled) { border-color: #aaa; }
    .pokemon-card--selected { border-color: #111; background: #f8f8f8; }
    .pokemon-card--disabled { opacity: 0.4; cursor: not-allowed; }
    .pokemon-card--small { padding: 0.375rem; }
    .pokemon-card__sprite { width: 64px; height: 64px; object-fit: contain; }
    .pokemon-card__name { font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
    .pokemon-card__types { display: flex; gap: 0.25rem; flex-wrap: wrap; justify-content: center; }

    /* Type badges */
    .type-badge {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      background: #e5e5e5;
      text-transform: capitalize;
    }

    /* Combat field */
    .combat__field {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      justify-content: center;
    }
    .combat__side {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .combat__label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
    .combat__sprite { width: 96px; height: 96px; object-fit: contain; }
    .combat__pokemon-name { font-weight: 700; text-transform: capitalize; margin: 0; }
    .combat__pokemon-name--ko { color: #dc2626; }
    .combat__actions { display: flex; flex-direction: column; gap: 0.75rem; }
    .combat__actions-title { font-weight: 600; margin: 0; }
    .combat__switch-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .combat__waiting { color: #888; font-style: italic; }

    /* Finished */
    .finished { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .finished__result { font-size: 2rem; font-weight: 800; margin: 0; }
    .finished__result--win { color: #16a34a; }
    .finished__result--loss { color: #dc2626; }
    .finished__turns { color: #888; margin: 0; }
    .finished__history {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      max-height: 16rem;
      overflow-y: auto;
    }
    .turn-row {
      display: flex;
      gap: 1rem;
      align-items: center;
      font-size: 0.85rem;
      padding: 0.4rem 0.6rem;
      background: #f8f8f8;
      border-radius: 4px;
    }
    .turn-row__num { font-weight: 700; color: #888; min-width: 3.5rem; }
    .turn-row__ko { color: #dc2626; font-weight: 600; }
  `]
})
export class BattleViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CombatApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly battle = signal<Battle | null>(null);
  readonly error = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly draftSelection = signal<number[]>([]);
  readonly recommendations = signal<BattlePokemon[]>([]);
  readonly myId = signal<string | null>(null);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private battleId = '';

  ngOnInit(): void {
    this.battleId = this.route.snapshot.paramMap.get('id') ?? '';
    this.myId.set(this.auth.getPlayerId());
    this.fetchBattle();
    this.pollTimer = setInterval(() => this.fetchBattle(), POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private fetchBattle(): void {
    this.api.getBattle(this.battleId).subscribe({
      next: b => {
        this.battle.set(b);
        this.error.set(null);
        this.cdr.markForCheck();
        if (b.status === 'FINISHED' && this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      },
      error: () => {
        this.error.set('Impossible de charger le combat.');
        this.cdr.markForCheck();
      }
    });
  }

  isMyDraftTurn(b: Battle): boolean {
    const idx = b.draftTurnIndex;
    if (idx >= DRAFT_ORDER.length) return false;
    const [team] = DRAFT_ORDER[idx];
    return team === 0 ? b.redPlayerId === this.myId() : b.bluePlayerId === this.myId();
  }

  draftPickCount(b: Battle): number {
    const idx = b.draftTurnIndex;
    if (idx >= DRAFT_ORDER.length) return 0;
    return DRAFT_ORDER[idx][1];
  }

  toggleDraftPick(b: Battle, p: BattlePokemon): void {
    if (!this.isMyDraftTurn(b)) return;
    const needed = this.draftPickCount(b);
    const current = this.draftSelection();
    if (current.includes(p.id)) {
      this.draftSelection.set(current.filter(id => id !== p.id));
    } else if (current.length < needed) {
      this.draftSelection.set([...current, p.id]);
    }
  }

  isDraftSelected(id: number): boolean {
    return this.draftSelection().includes(id);
  }

  confirmDraft(b: Battle): void {
    const playerId = this.myId();
    if (!playerId) return;
    this.submitting.set(true);
    this.actionError.set(null);

    this.api.draftPick(this.battleId, { playerId, pokemonIds: this.draftSelection() }).subscribe({
      next: updated => {
        this.battle.set(updated);
        this.draftSelection.set([]);
        this.recommendations.set([]);
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.actionError.set(err.error?.error ?? 'Erreur lors du pick.');
        this.submitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  recommendPokemon(b: Battle): void {
    const team = this.myTeam(b);
    const scored = b.draftPool
      .map(p => ({
        pokemon: p,
        score: this.recommendationScore(p, team)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(entry => entry.pokemon);

    this.recommendations.set(scored);
    this.cdr.markForCheck();
  }

  isRecommended(id: number): boolean {
    return this.recommendations().some(p => p.id === id);
  }

  private recommendationScore(candidate: BattlePokemon, team: BattlePokemon[]): number {
    const teamTypeSet = new Set(team.flatMap(p => p.types));
    const candidateTypes = candidate.types;

    const diversityBonus = candidateTypes.filter(t => !teamTypeSet.has(t)).length * 2;
    const overlapPenalty = candidateTypes.filter(t => teamTypeSet.has(t)).length * 0.4;

    const typeStrengthScore = candidateTypes.reduce((score, atkType) => {
      const strengths = TYPE_EFFECTIVENESS[atkType] ?? {};
      return score + Array.from(teamTypeSet).reduce((sub, defType) => {
        return sub + (strengths[defType] ?? 1);
      }, 0);
    }, 0);

    return typeStrengthScore + diversityBonus - overlapPenalty;
  }

  myTeam(b: Battle): BattlePokemon[] {
    return b.redPlayerId === this.myId() ? b.redTeam : b.blueTeam;
  }

  myActive(b: Battle): BattlePokemon | null {
    return b.redPlayerId === this.myId() ? b.redActivePokemon : b.blueActivePokemon;
  }

  opponentActive(b: Battle): BattlePokemon | null {
    return b.redPlayerId === this.myId() ? b.blueActivePokemon : b.redActivePokemon;
  }

  hasActed(b: Battle): boolean {
    return b.redPlayerId === this.myId() ? b.redAction != null : b.blueAction != null;
  }

  submitStay(b: Battle): void {
    const playerId = this.myId();
    if (!playerId) return;
    this.submitAction(b, { playerId, actionType: 'STAY', pokemonId: null });
  }

  submitSwitch(b: Battle, p: BattlePokemon): void {
    const playerId = this.myId();
    if (!playerId) return;
    this.submitAction(b, { playerId, actionType: 'SWITCH', pokemonId: p.id });
  }

  private submitAction(b: Battle, req: { playerId: string; actionType: ActionType; pokemonId: number | null }): void {
    this.submitting.set(true);
    this.actionError.set(null);

    this.api.submitAction(this.battleId, req).subscribe({
      next: updated => {
        this.battle.set(updated);
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.actionError.set(err.error?.error ?? 'Erreur lors de l\'action.');
        this.submitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  confirmForfeit(b: Battle): void {
    const playerId = this.myId();
    if (!playerId || !confirm('Abandonner le combat ?')) return;
    this.submitting.set(true);

    this.api.forfeit(this.battleId, { playerId }).subscribe({
      next: updated => {
        this.battle.set(updated);
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.actionError.set(err.error?.error ?? 'Erreur lors de l\'abandon.');
        this.submitting.set(false);
        this.cdr.markForCheck();
      }
    });
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
