import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CombatApiService } from '../../../core/api/combat-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserApiService, UserSearchResult } from '../../../core/api/user-api.service';
import { TeamApiService } from '../../../core/api/team-api.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { Battle, BattleMode } from '../../../shared/types/combat.types';
import { TeamResponse } from '../../../shared/types/team.types';
import { APP_ENV } from '../../../core/env/app-env';
import { Pipe, PipeTransform } from '@angular/core';


@Pipe({ name: 'teamNames', standalone: true })
export class TeamNamesPipe implements PipeTransform {
  transform(pokemons: TeamResponse['pokemons']): string {
    return pokemons
      .sort((a, b) => a.slot - b.slot)
      .map(p => p.pokemonName)
      .join(', ');
  }
}

@Component({
  selector: 'app-battle-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink, FormsModule, TeamNamesPipe],
  templateUrl: './battle-create.component.html',
  styleUrl: './battle-create.component.css'
})
export class BattleCreateComponent implements OnInit {
  private readonly api = inject(CombatApiService);
  private readonly userApi = inject(UserApiService);
  private readonly teamApi = inject(TeamApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly env = inject(APP_ENV);

  opponentUsername = '';
  readonly opponent = signal<UserSearchResult | null>(null);
  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly selectedMode = signal<BattleMode>('DRAFT');
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly myTeams = signal<TeamResponse[]>([]);
  readonly selectedTeamId = signal<string | null>(null);

  readonly modes: { value: BattleMode; label: string; description: string }[] = [
    { value: 'DRAFT', label: 'Draft', description: 'Choisissez vos Pokémon dans un pool commun.' },
    { value: 'BUILT', label: 'Construit', description: 'Jouez avec une équipe de votre choix.' },
    { value: 'RANDOM', label: 'Aléatoire', description: 'Équipes générées aléatoirement.' }
  ];

  ngOnInit(): void {
    this.teamApi.getMyTeams().subscribe({
      next: teams => {
        this.myTeams.set(teams.filter(t => t.pokemons.length === 6));
        this.cdr.markForCheck();
      }
    });
  }

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
        this.cdr.markForCheck();
      },
      error: (err: { status: number }) => {
        this.searchError.set(err.status === 404 ? 'Utilisateur introuvable.' : 'Erreur lors de la recherche.');
        this.searching.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  createBattle(): void {
    const opp = this.opponent();
    if (!opp) { this.createError.set('Aucun adversaire sélectionné.'); return; }

    const myId = this.auth.getPlayerId();
    if (!myId) { this.createError.set('Token invalide ou expiré — reconnectez-vous.'); return; }

    if (this.selectedMode() === 'BUILT' && !this.selectedTeamId()) {
      this.createError.set('Sélectionne une équipe pour le mode Construit.');
      return;
    }

    const myColor = this.env.COLOR;
    this.creating.set(true);
    this.createError.set(null);

    const selectedTeam = this.myTeams().find(t => t.teamId === this.selectedTeamId());
    const myPokemonIds = selectedTeam?.pokemons
      .sort((a, b) => a.slot - b.slot)
      .map(p => p.pokemonId) ?? [];

    this.api.createBattle({
      redPlayerId: myColor === 'red' ? myId : opp.username,
      bluePlayerId: myColor === 'red' ? opp.username : myId,
      mode: this.selectedMode(),
      redTeam: myColor === 'red' ? myPokemonIds : [],
      blueTeam: myColor === 'blue' ? myPokemonIds : []
    }).subscribe({
      next: (battle: Battle) => this.router.navigate(['/combat/battle', battle.battleId]),
      error: (err: { error?: { error?: string } }) => {
        this.createError.set(err.error?.error ?? 'Impossible de créer le combat.');
        this.creating.set(false);
        this.cdr.markForCheck();
      }
    });
  }
}