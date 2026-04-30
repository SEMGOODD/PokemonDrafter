import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    OnInit,
    signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TeamApiService } from '../../../core/api/team-api.service';
import { PlayerApiService } from '../../../core/api/player-api.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { TeamResponse, PlayerResponse } from '../../../shared/types/team.types';

@Component({
    selector: 'app-team-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageFrameComponent, RouterLink],
    templateUrl: './team-list.component.html',
    styleUrl: './team-list.component.css'
})
export class TeamListComponent implements OnInit {
    private readonly teamApi = inject(TeamApiService);
    private readonly playerApi = inject(PlayerApiService);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly teams = signal<TeamResponse[]>([]);
    readonly player = signal<PlayerResponse | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly deleting = signal<string | null>(null); // teamId being deleted

    ngOnInit(): void {
        this.load();
    }

    private load(): void {
        this.playerApi.getMe().subscribe({
            next: p => {
                this.player.set(p);
                this.cdr.markForCheck();
            }
        });

        this.teamApi.getMyTeams().subscribe({
            next: teams => {
                this.teams.set(teams);
                this.loading.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de charger tes équipes.');
                this.loading.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    createTeam(): void {
        const name = prompt('Nom de la nouvelle équipe :')?.trim();
        if (!name) return;

        this.teamApi.createTeam({ name }).subscribe({
            next: team => {
                this.teams.update(list => [...list, team]);
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de créer l\'équipe.');
                this.cdr.markForCheck();
            }
        });
    }

    deleteTeam(teamId: string): void {
        if (!confirm('Supprimer cette équipe ?')) return;
        this.deleting.set(teamId);

        this.teamApi.deleteTeam(teamId).subscribe({
            next: () => {
                this.teams.update(list => list.filter(t => t.teamId !== teamId));
                this.deleting.set(null);
                this.cdr.markForCheck();
            },
            error: () => {
                this.error.set('Impossible de supprimer l\'équipe.');
                this.deleting.set(null);
                this.cdr.markForCheck();
            }
        });
    }

    goToDetail(teamId: string): void {
        this.router.navigate(['/teams', teamId]);
    }

    goToComplete(teamId: string): void {
        this.router.navigate(['/teams', teamId, 'complete']);
    }

    pokemonCount(team: TeamResponse): number {
        return team.pokemons.length;
    }
}