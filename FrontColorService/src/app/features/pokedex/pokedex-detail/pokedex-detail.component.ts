import { Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { PokemonApiService } from '../../../core/api/pokemon-api.service';
import { TeamApiService } from '../../../core/api/team-api.service';
import { translateHabitat } from '../../../shared/constants/pokemon-habitats.const';
import { Pokemon } from '../../../shared/types/pokemon.types';
import { TeamResponse } from '../../../shared/types/team.types';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { TypeBadgeComponent } from '../../../shared/ui/type-badge/type-badge.component';
import { FormsModule } from '@angular/forms';

const POKEMON_ID_PAD_LENGTH = 3;
const STAT_MAX_VALUE = 255;
const PERCENT_MAX = 100;
const HEIGHT_DECIMETRES_TO_METRES = 10;
const WEIGHT_HECTOGRAMS_TO_KILOGRAMS = 10;
const POKEDEX_SEARCH_ROUTE = '/pokedex';

interface StatRow {
  readonly label: string;
  readonly value: number;
  readonly colorVar: string;
}

@Component({
  selector: 'app-pokedex-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, TypeBadgeComponent, FormsModule],
  templateUrl: './pokedex-detail.component.html',
  styleUrl: './pokedex-detail.component.scss'
})
export class PokedexDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly pokemonApi = inject(PokemonApiService);
  private readonly teamApi = inject(TeamApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly id = toSignal(
    this.route.paramMap.pipe(map(params => Number(params.get('id')))),
    { initialValue: 0 }
  );

  readonly detailResource = rxResource<Pokemon | null, number>({
    params: () => this.id(),
    stream: ({ params }) => this.pokemonApi.getById(params),
    defaultValue: null
  });

  readonly pokemon = this.detailResource.value;
  readonly isLoading = this.detailResource.isLoading;
  readonly error = this.detailResource.error;

  // Team addition
  readonly myTeams = signal<TeamResponse[]>([]);
  readonly selectedTeamId = signal<string>('');
  readonly selectedSlot = signal<number>(1);
  readonly adding = signal(false);
  readonly addSuccess = signal<string | null>(null);
  readonly addError = signal<string | null>(null);
  readonly showAddPanel = signal(false);

  constructor() {
    this.teamApi.getMyTeams().subscribe({
      next: teams => {
        this.myTeams.set(teams.filter(t => t.pokemons.length < 6));
        this.cdr.markForCheck();
      }
    });
  }

  readonly paddedId = computed(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return '';
    return pokemon.id.toString().padStart(POKEMON_ID_PAD_LENGTH, '0');
  });

  readonly heightMetres = computed(() => {
    const pokemon = this.pokemon();
    return pokemon ? pokemon.height / HEIGHT_DECIMETRES_TO_METRES : 0;
  });

  readonly weightKilograms = computed(() => {
    const pokemon = this.pokemon();
    return pokemon ? pokemon.weight / WEIGHT_HECTOGRAMS_TO_KILOGRAMS : 0;
  });

  readonly habitatLabel = computed(() => translateHabitat(this.pokemon()?.habitat));

  readonly statRows = computed<StatRow[]>(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return [];
    const s = pokemon.stats;
    return [
      { label: 'PV', value: s.hp, colorVar: '--stat-hp' },
      { label: 'Attaque', value: s.attack, colorVar: '--stat-attack' },
      { label: 'Défense', value: s.defense, colorVar: '--stat-defense' },
      { label: 'Att. Spé.', value: s.specialAttack, colorVar: '--stat-sp-attack' },
      { label: 'Déf. Spé.', value: s.specialDefense, colorVar: '--stat-sp-defense' },
      { label: 'Vitesse', value: s.speed, colorVar: '--stat-speed' }
    ];
  });

  readonly availableSlots = computed(() => {
    const teamId = this.selectedTeamId();
    const team = this.myTeams().find(t => t.teamId === teamId);
    if (!team) return [1, 2, 3, 4, 5, 6];
    const taken = team.pokemons.map(p => p.slot);
    return [1, 2, 3, 4, 5, 6].filter(s => !taken.includes(s));
  });

  percentOfMax(value: number): number {
    return Math.round((value / STAT_MAX_VALUE) * PERCENT_MAX);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate([POKEDEX_SEARCH_ROUTE]);
  }

  addToTeam(): void {
    const p = this.pokemon();
    const teamId = this.selectedTeamId();
    const slot = this.selectedSlot();
    if (!p || !teamId || !slot) return;

    this.adding.set(true);
    this.addError.set(null);
    this.addSuccess.set(null);

    this.teamApi.addPokemon(teamId, { pokemonId: p.id, slot }).subscribe({
      next: () => {
        this.addSuccess.set(`${p.name} ajouté à l'équipe !`);
        this.adding.set(false);
        // Refresh teams to update available slots
        this.teamApi.getMyTeams().subscribe({
          next: teams => {
            this.myTeams.set(teams.filter(t => t.pokemons.length < 6));
            this.cdr.markForCheck();
          }
        });
        this.cdr.markForCheck();
      },
      error: err => {
        this.addError.set(err.error?.error ?? 'Impossible d\'ajouter le Pokémon.');
        this.adding.set(false);
        this.cdr.markForCheck();
      }
    });
  }
}