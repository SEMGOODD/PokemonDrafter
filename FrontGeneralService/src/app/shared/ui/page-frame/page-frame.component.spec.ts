import { TestBed } from '@angular/core/testing';

import { ThemeService } from '../../../core/theme/theme.service';
import { createThemeServiceTestDouble } from '../../../../testing/theme-service-test-double';
import { PageFrameComponent } from './page-frame.component';

describe('PageFrameComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageFrameComponent],
      providers: [{ provide: ThemeService, useFactory: createThemeServiceTestDouble }]
    }).compileComponents();
  });

  // Verifie que le cadre de page se monte avec ThemeService reel (integration legere header + contenu projete).
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(PageFrameComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le bandeau neutre s affiche quand aucune equipe n est selectionnee (theme neutral).
  it('devrait afficher la barre neutre lorsque le theme est neutral', () => {
    const fixture = TestBed.createComponent(PageFrameComponent);
    const themeService = TestBed.inject(ThemeService);
    themeService.setUserColor(null);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.page-frame__stripe-neutral')).not.toBeNull();
  });

  // Verifie que le bandeau thematique remplace le neutre lorsqu une couleur d equipe est active.
  it('devrait afficher la barre thematique lorsque le theme n est pas neutral', () => {
    const fixture = TestBed.createComponent(PageFrameComponent);
    fixture.detectChanges();
    const themeService = TestBed.inject(ThemeService);
    themeService.setUserColor('red');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.page-frame__stripe-themed')).not.toBeNull();
    expect(root.querySelector('.page-frame__stripe-neutral')).toBeNull();
  });
});
