import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

const HOME_ROUTE = '/';
const HISTORY_HAS_PREVIOUS = 1;

@Component({
  selector: 'app-page-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="page-actions" aria-label="Navigation de page">
      <button type="button" class="page-actions__btn" (click)="goBack()">
        &larr; Retour
      </button>
      <button type="button" class="page-actions__btn" (click)="goHome()">
        Accueil
      </button>
    </nav>
  `,
  styles: [`
    .page-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .page-actions__btn {
      padding: 0.4rem 0.9rem;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      background: #fff;
      color: #111;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .page-actions__btn:hover {
      background: #f3f4f6;
    }
    .page-actions__btn:focus-visible {
      outline: 2px solid var(--theme-color, #111);
      outline-offset: 2px;
    }
  `]
})
export class PageActionsComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  goBack(): void {
    if (window.history.length > HISTORY_HAS_PREVIOUS) {
      this.location.back();
      return;
    }
    this.goHome();
  }

  goHome(): void {
    this.router.navigate([HOME_ROUTE]);
  }
}
