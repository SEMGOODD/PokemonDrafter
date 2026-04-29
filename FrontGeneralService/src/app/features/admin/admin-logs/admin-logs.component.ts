import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, switchMap, takeUntil, timer } from 'rxjs';

import { LogEntry, LogsApiService } from '../../../core/api/logs-api.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';

const LOG_REFRESH_INTERVAL_MS = 5000;
const FILTER_DEBOUNCE_MS = 300;
const QUERY_LIMIT = 200;
const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;

type Level = typeof LEVELS[number];

@Component({
  selector: 'app-admin-logs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, ReactiveFormsModule],
  template: `
    <app-page-frame>
      <section class="logs">
        <header class="logs__header">
          <h1>Console admin — logs</h1>
          <p class="logs__hint">Logs de tous les services agrégés via Kafka. Mise à jour toutes les {{ refreshIntervalSeconds }} s.</p>
        </header>

        <form class="logs__filters">
          <label>
            Service
            <select [formControl]="serviceFilter">
              <option [ngValue]="null">— Tous —</option>
              @for (s of services(); track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </label>
          <label>
            Niveau
            <select [formControl]="levelFilter">
              <option [ngValue]="null">— Tous —</option>
              @for (l of levels; track l) {
                <option [value]="l">{{ l }}</option>
              }
            </select>
          </label>
          <label class="logs__search">
            Recherche
            <input type="text" [formControl]="searchFilter" placeholder="Texte dans le message..." />
          </label>
        </form>

        @if (loading()) {
          <p class="logs__status">Chargement...</p>
        } @else if (entries().length === 0) {
          <p class="logs__status">Aucun log pour les filtres choisis.</p>
        } @else {
          <table class="logs__table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Service</th>
                <th>Niveau</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.id) {
                <tr [class]="'logs__row logs__row--' + entry.level.toLowerCase()">
                  <td class="logs__ts">{{ entry.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</td>
                  <td>{{ entry.service }}</td>
                  <td><span class="logs__level">{{ entry.level }}</span></td>
                  <td class="logs__msg">{{ entry.message }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </app-page-frame>
  `,
  styles: [`
    .logs { max-width: 80rem; margin: 2rem auto; }
    .logs__header { margin-bottom: 1.5rem; }
    .logs__header h1 { margin: 0; font-size: 1.75rem; font-weight: 800; }
    .logs__hint { color: #666; margin: 0.25rem 0 0; font-size: 0.9rem; }
    .logs__filters { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; align-items: end; }
    .logs__filters label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: #444; }
    .logs__filters select, .logs__filters input {
      padding: 0.4rem 0.6rem; border: 1px solid #ccc; border-radius: 6px; font-size: 0.95rem;
    }
    .logs__search { flex: 1; min-width: 16rem; }
    .logs__search input { width: 100%; }
    .logs__status { color: #777; font-style: italic; }
    .logs__table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .logs__table th, .logs__table td {
      text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee;
    }
    .logs__table th { background: #fafafa; font-weight: 600; }
    .logs__ts { white-space: nowrap; color: #555; font-family: monospace; }
    .logs__msg { word-break: break-word; }
    .logs__level {
      display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px;
      font-size: 0.75rem; font-weight: 700; background: #eee;
    }
    .logs__row--error .logs__level { background: #fde0e0; color: #a00; }
    .logs__row--warn .logs__level { background: #fff3cd; color: #946100; }
    .logs__row--info .logs__level { background: #e0ecff; color: #1a4f99; }
    .logs__row--debug .logs__level { background: #eee; color: #555; }
  `]
})
export class AdminLogsComponent implements OnInit, OnDestroy {
  private readonly api = inject(LogsApiService);
  private readonly destroy$ = new Subject<void>();
  private readonly trigger$ = new Subject<void>();

  readonly refreshIntervalSeconds = LOG_REFRESH_INTERVAL_MS / 1000;
  readonly levels = LEVELS;

  readonly serviceFilter = new FormControl<string | null>(null);
  readonly levelFilter = new FormControl<Level | null>(null);
  readonly searchFilter = new FormControl<string>('');

  readonly entries = signal<LogEntry[]>([]);
  readonly services = signal<string[]>([]);
  readonly loading = signal<boolean>(true);

  readonly hasFilters = computed(() =>
    !!this.serviceFilter.value || !!this.levelFilter.value || !!this.searchFilter.value
  );

  ngOnInit(): void {
    this.loadServices();

    this.trigger$
      .pipe(
        debounceTime(FILTER_DEBOUNCE_MS),
        switchMap(() => this.api.search({
          service: this.serviceFilter.value,
          level: this.levelFilter.value,
          q: this.searchFilter.value,
          limit: QUERY_LIMIT
        })),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: data => { this.entries.set(data); this.loading.set(false); },
        error: () => { this.entries.set([]); this.loading.set(false); }
      });

    [this.serviceFilter, this.levelFilter, this.searchFilter].forEach(ctrl =>
      ctrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.trigger$.next())
    );

    timer(0, LOG_REFRESH_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.trigger$.next());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadServices(): void {
    this.api.listServices().pipe(takeUntil(this.destroy$)).subscribe({
      next: list => this.services.set(list),
      error: () => this.services.set([])
    });
  }
}
