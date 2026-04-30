import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ThemeService } from '../../../core/theme/theme.service';
import { Theme } from '../../../core/theme/theme.types';
import { PokeballButtonComponent } from './pokeball-button.component';

describe('PokeballButtonComponent', () => {
  const registerSpy = vi.fn();
  const themeSignal = signal<Theme>('red');
  const mockTheme: Pick<ThemeService, 'theme' | 'registerPokeballClick'> = {
    theme: themeSignal.asReadonly(),
    registerPokeballClick: registerSpy
  };

  beforeEach(async () => {
    registerSpy.mockClear();
    themeSignal.set('red');
    await TestBed.configureTestingModule({
      imports: [PokeballButtonComponent],
      providers: [{ provide: ThemeService, useValue: mockTheme as unknown as ThemeService }]
    }).compileComponents();
  });

  // Verifie que le bouton pokeball se cree avec le double ThemeService injecte.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(PokeballButtonComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le clic delegue au ThemeService pour le compteur easter-egg.
  it('devrait appeler registerPokeballClick au clic', () => {
    const fixture = TestBed.createComponent(PokeballButtonComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button).not.toBeNull();
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(registerSpy).toHaveBeenCalledTimes(1);
  });
});
