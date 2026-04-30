import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PokemonSummary } from '../../../shared/types/pokemon.types';
import { PokemonSummaryCardComponent } from './pokemon-summary-card.component';

const samplePokemon: PokemonSummary = {
  id: 25,
  name: 'pikachu',
  types: ['electric'],
  sprite: 'https://example.com/sprite.png'
};

describe('PokemonSummaryCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokemonSummaryCardComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  // Verifie que la carte resume se cree avec un PokemonSummary injecte via setInput.
  it('devrait instancier le composant', () => {
    const fixture = TestBed.createComponent(PokemonSummaryCardComponent);
    fixture.componentRef.setInput('pokemon', samplePokemon);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Verifie que l identifiant numerique est padde pour l affichage (format Pokedex).
  it('devrait exposer paddedId avec zeros de tete', () => {
    const fixture = TestBed.createComponent(PokemonSummaryCardComponent);
    fixture.componentRef.setInput('pokemon', samplePokemon);
    fixture.detectChanges();
    expect(fixture.componentInstance.paddedId()).toBe('025');
  });
});
