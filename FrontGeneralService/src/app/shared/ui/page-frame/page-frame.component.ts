import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ThemeService } from '../../../core/theme/theme.service';
import { PokeballButtonComponent } from '../pokeball/pokeball-button.component';

@Component({
  selector: 'app-page-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PokeballButtonComponent],
  template: `
    <div class="page-frame">
      <header class="page-frame__header">
        @if (isNeutral()) {
          <div class="page-frame__stripe-neutral"></div>
        } @else {
          <div class="page-frame__stripe-themed"></div>
          <div class="page-frame__separator"></div>
        }
        <div class="page-frame__pokeball">
          <app-pokeball-button/>
        </div>
      </header>
      <main class="page-frame__content">
        <ng-content/>
      </main>
    </div>
  `,
  styleUrl: './page-frame.component.scss'
})
export class PageFrameComponent {
  private readonly themeService = inject(ThemeService);

  readonly isNeutral = computed(() => this.themeService.theme() === 'neutral');
}
