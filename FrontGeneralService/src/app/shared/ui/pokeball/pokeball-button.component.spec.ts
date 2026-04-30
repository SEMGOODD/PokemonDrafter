import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Theme } from '../../../core/theme/theme.types';
import { ThemeService } from '../../../core/theme/theme.service';
import { PokeballButtonComponent } from './pokeball-button.component';

describe('PokeballButtonComponent', () => {
  const registerPokeballClickSpy = jasmine.createSpy('registerPokeballClick');
  const themeSignal = signal<Theme>('neutral');
  const mockThemeService = {
    theme: themeSignal.asReadonly(),
    registerPokeballClick: registerPokeballClickSpy
  };

  beforeEach(async () => {
    registerPokeballClickSpy.calls.reset();
    themeSignal.set('neutral');
    await TestBed.configureTestingModule({
      imports: [PokeballButtonComponent],
      providers: [{ provide: ThemeService, useValue: mockThemeService as unknown as ThemeService }]
    }).compileComponents();
  });

  // Verifie que le composant se cree lorsque ThemeService est fourni (dependance obligatoire).
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(PokeballButtonComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le clic utilisateur declenche bien la logique easter-egg du theme (delegation au service).
  it('devrait appeler registerPokeballClick lors du clic sur le bouton', () => {
    const fixture = TestBed.createComponent(PokeballButtonComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button).not.toBeNull();
    button!.click();
    expect(registerPokeballClickSpy).toHaveBeenCalledTimes(1);
  });
});
