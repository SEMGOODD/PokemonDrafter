import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../env/app-env';

const LOGS_PATH = '/api/logs';
const SERVICES_PATH = '/api/logs/services';

export interface LogEntry {
  id: number;
  service: string;
  level: string;
  timestamp: string;
  message: string;
  context: string;
}

export interface LogQueryParams {
  service?: string | null;
  level?: string | null;
  q?: string | null;
  limit?: number | null;
}

@Injectable({ providedIn: 'root' })
export class LogsApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  search(params: LogQueryParams): Observable<LogEntry[]> {
    let httpParams = new HttpParams();
    if (params.service) httpParams = httpParams.set('service', params.service);
    if (params.level) httpParams = httpParams.set('level', params.level);
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<LogEntry[]>(`${this.env.GATEWAY_URL}${LOGS_PATH}`, { params: httpParams });
  }

  listServices(): Observable<string[]> {
    return this.http.get<string[]>(`${this.env.GATEWAY_URL}${SERVICES_PATH}`);
  }
}
