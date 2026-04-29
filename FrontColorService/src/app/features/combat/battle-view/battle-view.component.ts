import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CombatApiService } from '../../../core/api/combat-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { ActionType, Battle, BattlePokemon } from '../../../shared/types/combat.types';
import { ChatComponent } from '../chat/chat.component';

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
  imports: [PageFrameComponent, RouterLink, ChatComponent],
  templateUrl: './battle-view.component.html',
  styleUrl: './battle-view.component.css'
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

  myColor(b: Battle): 'red' | 'blue' {
    const id = this.myId();
    if (b.redPlayerId === id) return 'red';
    if (b.bluePlayerId === id) return 'blue';
    return id?.includes('red') ? 'red' : 'blue';
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