import { computed, signal } from '@angular/core';

import { TeamColor } from '../app/core/env/app-env';
import { ThemeService } from '../app/core/theme/theme.service';
import { Theme } from '../app/core/theme/theme.types';

export function createThemeServiceTestDouble(): ThemeService {
  const userColor = signal<TeamColor | null>(null);
  const themeSignal = computed<Theme>(() => {
    const color = userColor();
    if (color === 'red' || color === 'blue') {
      return color;
    }
    return 'neutral';
  });
  return {
    theme: themeSignal,
    setUserColor: (color: TeamColor | null): void => {
      userColor.set(color);
    },
    registerPokeballClick: (): void => {}
  } as unknown as ThemeService;
}
