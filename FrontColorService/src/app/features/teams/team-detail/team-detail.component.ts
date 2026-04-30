import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    OnInit,
    Pipe,
    PipeTransform,
    signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TeamApiService } from '../../../core/api/team-api.service';
import { PokemonApiService } from '../../../core/api/pokemon-api.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { TeamResponse, TeamPokemonResponse } from '../../../shared/types/team.types';
import { PokemonSummary } from '../../../shared/types/pokemon.types';

@Pipe({ name: 'slotPokemon', standalone: true })
export class SlotPokemonPipe implements PipeTransform {
    transform(pokemons: TeamPokemonResponse[], slot: number): TeamPokemonResponse | null {
        return pokemons.find(p => p.slot === slot) ?? null;
    }
}

@Component({
    selector: 'app-team-detail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageFrameComponent, RouterLink, FormsModule, SlotPokemonPipe],
    templateUrl: './team-detail.component.html',
    styleUrl: './team-detail.component.css'
})
export class TeamDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly teamApi = inject(TeamApiService);
    private readonly pokemonApi = inject(PokemonApiService);
    private readonly cdr = inject(ChangeDetectorRef);

    protected teamId = '';

    readonly team = signal<TeamResponse | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly saving = signal(false);

    searchName = '';
    readonly searchResults = signal<PokemonSummary[]>([]);
    readonly searching = signal(false);
    readonly selectedSlot = signal<number>(1);

    readonly availableSlots = [1, 2, 3, 4, 5, 6];

    ngOnInit(): void {
        this.teamId = this.route.snapshot.paramMap.get('teamId') ?? '';
        this.loadTeam();
    }

    private loadTeam(): void {
        this.teamApi.getMyTeams().subscribe({
            next: teams => {
                const found = teams.find(t => t.teamId === this.teamId) ?? null;
                this.team.set(found);
                this.loading.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de charger l\'équipe.');
                this.loading.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    searchPokemon(): void {
        const name = this.searchName.trim();
        if (!name) return;
        this.searching.set(true);

        this.pokemonApi.search({ name, page: 0, pageSize: 10 }).subscribe({
            next: results => {
                this.searchResults.set(results);
                this.searching.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.searching.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    addPokemon(pokemon: PokemonSummary): void {
        const slot = this.selectedSlot();
        const team = this.team();
        if (!team) return;

        const slotTaken = team.pokemons.some(p => p.slot === slot);
        if (slotTaken) {
            this.error.set(`Le slot ${slot} est déjà occupé. Retire le Pokémon d'abord.`);
            return;
        }

        this.saving.set(true);
        this.error.set(null);

        this.teamApi.addPokemon(this.teamId, { pokemonId: pokemon.id, slot }).subscribe({
            next: updated => {
                this.team.set(updated);
                this.searchResults.set([]);
                this.searchName = '';
                this.saving.set(false);
                this.cdr.markForCheck();
            },
            error: err => {
                this.error.set(err.error?.error ?? 'Impossible d\'ajouter le Pokémon.');
                this.saving.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    removePokemon(p: TeamPokemonResponse): void {
        if (!confirm(`Retirer ${p.pokemonName} de l'équipe ?`)) return;
        this.saving.set(true);

        this.teamApi.removePokemon(this.teamId, p.slot).subscribe({
            next: updated => {
                this.team.set(updated);
                this.saving.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de retirer le Pokémon.');
                this.saving.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    renameTeam(): void {
        const name = prompt('Nouveau nom :', this.team()?.name)?.trim();
        if (!name) return;
        this.saving.set(true);

        this.teamApi.renameTeam(this.teamId, { name }).subscribe({
            next: updated => {
                this.team.set(updated);
                this.saving.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de renommer l\'équipe.');
                this.saving.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    isFull(): boolean {
        return (this.team()?.pokemons.length ?? 0) >= 6;
    }

    takenSlots(): number[] {
        return this.team()?.pokemons.map(p => p.slot) ?? [];
    }
}