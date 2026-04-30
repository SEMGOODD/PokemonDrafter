import { TestBed } from '@angular/core/testing';

import { TypeBadgeComponent } from './type-badge.component';

describe('TypeBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeBadgeComponent]
    }).compileComponents();
  });

  // Verifie que le badge type se cree lorsque l entree type est fournie via setInput.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(TypeBadgeComponent);
    fixture.componentRef.setInput('type', 'fire');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que le libelle du type est rendu dans le DOM (affichage utilisateur).
  it('devrait afficher le nom du type dans le template', () => {
    const fixture = TestBed.createComponent(TypeBadgeComponent);
    fixture.componentRef.setInput('type', 'water');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('water');
  });
});
