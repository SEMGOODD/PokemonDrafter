import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../env/app-env';
import {
  Battle,
  CreateBattleRequest,
  DraftPickRequest,
  ForfeitRequest,
  PlayerActionRequest,
  TurnResult
} from '../../shared/types/combat.types';

@Injectable({ providedIn: 'root' })
export class CombatApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private base(): string {
    return `${this.env.GATEWAY_URL}/api/combat`;
  }

  createBattle(request: CreateBattleRequest): Observable<Battle> {
    return this.http.post<Battle>(`${this.base()}/battle`, request);
  }

  getBattle(battleId: string): Observable<Battle> {
    return this.http.get<Battle>(`${this.base()}/battle/${battleId}`);
  }

  getMyBattles(): Observable<Battle[]> {
    return this.http.get<Battle[]>(`${this.base()}/battles/mine`);
  }

  getActiveBattles(): Observable<Battle[]> {
    return this.http.get<Battle[]>(`${this.base()}/battles/active`);
  }

  getTurns(battleId: string): Observable<TurnResult[]> {
    return this.http.get<TurnResult[]>(`${this.base()}/battle/${battleId}/turns`);
  }

  draftPick(battleId: string, request: DraftPickRequest): Observable<Battle> {
    return this.http.post<Battle>(`${this.base()}/battle/${battleId}/draft`, request);
  }

  submitAction(battleId: string, request: PlayerActionRequest): Observable<Battle> {
    return this.http.post<Battle>(`${this.base()}/battle/${battleId}/action`, request);
  }

  forfeit(battleId: string, request: ForfeitRequest): Observable<Battle> {
    return this.http.post<Battle>(`${this.base()}/battle/${battleId}/forfeit`, request);
  }
}
