import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Pokemon, PokemonSearchRequest, PokemonSummary } from '../../shared/types/pokemon.types';
import { APP_ENV } from '../env/app-env';

const POKEMON_SEARCH_PATH = '/api/pokemon/search';
const POKEMON_BY_ID_PATH = '/api/pokemon';

@Injectable({ providedIn: 'root' })
export class PokemonApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  search(request: PokemonSearchRequest): Observable<PokemonSummary[]> {
    let params = new HttpParams()
      .set('page', request.page)
      .set('pageSize', request.pageSize);
    if (request.name && request.name.trim() !== '') {
      params = params.set('name', request.name.trim());
    }
    if (request.type1) {
      params = params.set('type1', request.type1);
    }
    if (request.type2) {
      params = params.set('type2', request.type2);
    }
    return this.http.get<PokemonSummary[]>(
      `${this.env.GATEWAY_URL}${POKEMON_SEARCH_PATH}`,
      { params }
    );
  }

  getById(id: number): Observable<Pokemon> {
    return this.http.get<Pokemon>(
      `${this.env.GATEWAY_URL}${POKEMON_BY_ID_PATH}/${id}`
    );
  }
}
