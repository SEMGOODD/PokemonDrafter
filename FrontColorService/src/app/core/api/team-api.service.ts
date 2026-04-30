import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_ENV } from '../env/app-env';
import {
    TeamResponse,
    TeamRequest,
    TeamPokemonRequest
} from '../../shared/types/team.types';

@Injectable({ providedIn: 'root' })
export class TeamApiService {
    private readonly http = inject(HttpClient);
    private readonly env = inject(APP_ENV);

    private base(): string {
        return `${this.env.GATEWAY_URL}/api/teams`;
    }

    getMyTeams(): Observable<TeamResponse[]> {
        return this.http.get<TeamResponse[]>(this.base());
    }

    createTeam(request: TeamRequest): Observable<TeamResponse> {
        return this.http.post<TeamResponse>(this.base(), request);
    }

    renameTeam(teamId: string, request: TeamRequest): Observable<TeamResponse> {
        return this.http.put<TeamResponse>(`${this.base()}/${teamId}`, request);
    }

    deleteTeam(teamId: string): Observable<void> {
        return this.http.delete<void>(`${this.base()}/${teamId}`);
    }

    addPokemon(teamId: string, request: TeamPokemonRequest): Observable<TeamResponse> {
        return this.http.post<TeamResponse>(`${this.base()}/${teamId}/pokemon`, request);
    }

    removePokemon(teamId: string, slot: number): Observable<TeamResponse> {
        return this.http.delete<TeamResponse>(`${this.base()}/${teamId}/pokemon/${slot}`);
    }
}