import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_ENV } from '../env/app-env';
import { PlayerResponse, ColorChangeRequest } from '../../shared/types/team.types';

@Injectable({ providedIn: 'root' })
export class PlayerApiService {
    private readonly http = inject(HttpClient);
    private readonly env = inject(APP_ENV);

    private base(): string {
        return `${this.env.GATEWAY_URL}/api/players`;
    }

    getMe(): Observable<PlayerResponse> {
        return this.http.get<PlayerResponse>(`${this.base()}/me`);
    }

    changeColor(request: ColorChangeRequest): Observable<PlayerResponse> {
        return this.http.put<PlayerResponse>(`${this.base()}/me/color`, request);
    }
}