import { ApplicationRef, computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';

import { TeamColor } from '../env/app-env';
import { PokeballVariant, Theme } from './theme.types';

const LOVE_TRIGGER_CLICKS = 5;
const LOVE_TRIGGER_WINDOW_MS = 2000;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);

  private readonly loveActive = signal(false);
  private readonly userColor = signal<TeamColor | null>(null);
  private recentClicks: number[] = [];

  readonly theme = computed<Theme>(() => {
    if (this.loveActive()) {
      return 'love';
    }
    const color = this.userColor();
    if (color === 'red') return 'red';
    if (color === 'blue') return 'blue';
    return 'neutral';
  });

  readonly pokeballVariant = computed<PokeballVariant>(() => {
    const current = this.theme();
    if (current === 'love') return 'love';
    if (current === 'red') return 'poke';
    if (current === 'blue') return 'super';
    return 'honor';
  });

  readonly isAuthenticated = computed(() => this.userColor() !== null);
  readonly currentUserColor = this.userColor.asReadonly();

  constructor() {
    this.writeThemeAttribute();
  }

  setUserColor(color: TeamColor | null): void {
    if (this.userColor() === color) {
      return;
    }
    this.transitionTheme(() => {
      this.userColor.set(color);
    });
  }

  registerPokeballClick(): void {
    const now = Date.now();
    this.recentClicks = this.recentClicks
      .filter(timestamp => now - timestamp < LOVE_TRIGGER_WINDOW_MS)
      .concat(now);
    if (this.recentClicks.length >= LOVE_TRIGGER_CLICKS) {
      this.recentClicks = [];
      this.transitionTheme(() => {
        this.loveActive.update(active => !active);
      });
    }
  }

  private transitionTheme(mutateState: () => void): void {
    if (typeof this.document.startViewTransition !== 'function') {
      mutateState();
      this.writeThemeAttribute();
      return;
    }
    this.document.startViewTransition(() => {
      mutateState();
      this.writeThemeAttribute();
      this.appRef.tick();
    });
  }

  private writeThemeAttribute(): void {
    this.document.documentElement.setAttribute('data-theme', this.theme());
  }
}
