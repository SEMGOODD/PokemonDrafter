import { TestBed } from '@angular/core/testing';

import { APP_ENV } from '../../../core/env/app-env';
import { ThemeService } from '../../../core/theme/theme.service';
import { createColorAppEnv } from '../../../../testing/color-app-env.stub';
import { PageFrameComponent } from './page-frame.component';

describe('PageFrameComponent', () => {
  beforeEach(async () => {
    const doc = document.documentElement as HTMLElement & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };
    doc.startViewTransition = (callback: () => void) => {
      callback();
      return { finished: Promise.resolve() };
    };
    await TestBed.configureTestingModule({
      imports: [PageFrameComponent],
      providers: [
        { provide: APP_ENV, useValue: createColorAppEnv('neutral') },
        ThemeService
      ]
    }).compileComponents();
  });

  // Verifie que le cadre de page se monte avec ThemeService reel lie a APP_ENV.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(PageFrameComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que la couleur neutral dans l env affiche le bandeau neutre (variante UI).
  it('devrait afficher la barre neutre lorsque COLOR est neutral', () => {
    const fixture = TestBed.createComponent(PageFrameComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.page-frame__stripe-neutral')).not.toBeNull();
  });
});
