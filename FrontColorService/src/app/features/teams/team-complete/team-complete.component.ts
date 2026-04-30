import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    OnInit,
    signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { TeamApiService } from '../../../core/api/team-api.service';
import { PokemonApiService } from '../../../core/api/pokemon-api.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { TeamResponse } from '../../../shared/types/team.types';
import { PokemonSummary } from '../../../shared/types/pokemon.types';

// Same effectiveness table as battle-view — shared logic
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

@Component({
    selector: 'app-team-complete',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageFrameComponent, RouterLink],
    templateUrl: './team-complete.component.html',
    styleUrl: './team-complete.component.css'
})
export class TeamCompleteComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly teamApi = inject(TeamApiService);
    private readonly pokemonApi = inject(PokemonApiService);
    private readonly cdr = inject(ChangeDetectorRef);

    protected teamId = '';

    readonly team = signal<TeamResponse | null>(null);
    readonly recommendations = signal<PokemonSummary[]>([]);
    readonly loading = signal(true);
    readonly computing = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.teamId = this.route.snapshot.paramMap.get('teamId') ?? '';
        this.loadAndCompute();
    }

    private loadAndCompute(): void {
        this.teamApi.getMyTeams().subscribe({
            next: teams => {
                const found = teams.find(t => t.teamId === this.teamId) ?? null;
                this.team.set(found);
                this.loading.set(false);
                if (found && found.pokemons.length > 0) {
                    this.computeRecommendations(found);
                }
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de charger l\'équipe.');
                this.loading.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    private computeRecommendations(team: TeamResponse): void {
        this.computing.set(true);
        const teamTypes = new Set(team.pokemons.map(p => p.pokemonName));

        // Search a broad pool then score
        this.pokemonApi.search({ page: 0, pageSize: 100 }).subscribe({
            next: candidates => {
                const teamPokemonIds = new Set(team.pokemons.map(p => p.pokemonId));
                const scored = candidates
                    .filter(c => !teamPokemonIds.has(c.id))
                    .map(c => ({ pokemon: c, score: this.score(c, team) }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 6)
                    .map(e => e.pokemon);

                this.recommendations.set(scored);
                this.computing.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de calculer les recommandations.');
                this.computing.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    private score(candidate: PokemonSummary, team: TeamResponse): number {
        const teamTypeSet = new Set(team.pokemons.flatMap(p => p.pokemonName.split('/')));
        const types = candidate.types;
        const diversity = types.filter(t => !teamTypeSet.has(t)).length * 2;
        const overlap = types.filter(t => teamTypeSet.has(t)).length * 0.4;
        const strength = types.reduce((acc, atkType) => {
            const row = TYPE_EFFECTIVENESS[atkType] ?? {};
            return acc + Array.from(teamTypeSet).reduce((s, def) => s + (row[def] ?? 1), 0);
        }, 0);
        return strength + diversity - overlap;
    }
}