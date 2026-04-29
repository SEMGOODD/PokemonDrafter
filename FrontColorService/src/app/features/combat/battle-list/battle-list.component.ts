import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CombatApiService } from '../../../core/api/combat-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { Battle } from '../../../shared/types/combat.types';

const POLL_INTERVAL_MS = 5000;

@Component({
  selector: 'app-battle-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageFrameComponent, RouterLink],
  templateUrl: './battle-list.component.html',
  styleUrl: './battle-list.component.css'
})
export class BattleListComponent implements OnInit, OnDestroy {
  private readonly api = inject(CombatApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly activeBattles = signal<Battle[]>([]);
  readonly finishedBattles = signal<Battle[]>([]);
  readonly loading = signal(true);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.load();
    this.pollTimer = setInterval(() => this.load(), POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private load(): void {
    this.api.getActiveBattles().subscribe({
      next: battles => {
        this.activeBattles.set(battles);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.loading.set(false)
    });

    this.api.getMyBattles().subscribe({
      next: battles => {
        this.finishedBattles.set(battles);
        this.cdr.markForCheck();
      }
    });
  }

  isWinner(battle: Battle): boolean {
    return battle.winnerId === this.auth.getPlayerId();
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT_PHASE: 'Phase de draft',
      IN_PROGRESS: 'En cours',
      FINISHED: 'Terminé'
    };
    return labels[status] ?? status;
  }
}