import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../env/app-env';

export interface UserSearchResult {
  id: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  searchByUsername(username: string): Observable<UserSearchResult> {
    return this.http.get<UserSearchResult>(
      `${this.env.GATEWAY_URL}/api/users/search`,
      { params: { username } }
    );
  }
}
