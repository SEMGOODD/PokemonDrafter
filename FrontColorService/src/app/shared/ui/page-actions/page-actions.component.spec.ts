import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { PageActionsComponent } from './page-actions.component';

describe('PageActionsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageActionsComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  // Verifie que la barre d actions se monte avec Location et Router injectes.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(PageActionsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le bouton Accueil declenche une navigation vers la racine (retour menu principal).
  it('devrait appeler router.navigate vers / lors du clic Accueil', () => {
    const fixture = TestBed.createComponent(PageActionsComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons[1]!.click();
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});
