import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-pokeball-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="onClick()" [attr.aria-label]="ariaLabel()">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="34" fill="#ffffff"/>
        <circle cx="50" cy="50" r="34" fill="none"/>
      </svg>
    </button>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    button {
      all: unset;
      cursor: pointer;
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
    button:focus-visible {
      outline: 3px solid var(--separator-color);
      outline-offset: 3px;
    }
    svg { width: 100%; height: 100%; display: block; overflow: visible; }
    svg circle[fill="none"] {
      stroke: var(--separator-color);
      stroke-width: var(--frame-line-thickness);
      vector-effect: non-scaling-stroke;
    }
  `]
})
export class PokeballButtonComponent {
  private readonly themeService = inject(ThemeService);

  readonly ariaLabel = computed(() => `Pokeball ${this.themeService.theme()}`);

  onClick(): void {
    this.themeService.registerPokeballClick();
  }
}
