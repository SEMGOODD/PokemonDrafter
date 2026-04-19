import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PokemonSummary } from '../../../shared/types/pokemon.types';
import { TypeBadgeComponent } from '../../../shared/ui/type-badge/type-badge.component';

const POKEMON_ID_PAD_LENGTH = 3;

@Component({
  selector: 'app-pokemon-summary-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TypeBadgeComponent],
  template: `
    <a class="card" [routerLink]="['/pokedex', pokemon().id]">
      <div class="card__sprite-wrap">
        <img class="card__sprite" [src]="pokemon().sprite" [alt]="pokemon().name" draggable="false"/>
      </div>
      <div class="card__meta">
        <span class="card__id">#{{ paddedId() }}</span>
        <h3 class="card__name">{{ pokemon().name }}</h3>
        <div class="card__types">
          @for (type of pokemon().types; track type) {
            <app-type-badge [type]="type"/>
          }
        </div>
      </div>
    </a>
  `,
  styles: [`
    :host { display: block; }
    .card {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border: 2px solid #000000;
      border-radius: 0.75rem;
      padding: 1rem;
      text-decoration: none;
      color: inherit;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 0 #000000;
    }
    .card__sprite-wrap {
      background: #f4f4f4;
      border-radius: 0.5rem;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card__sprite {
      width: 80%;
      height: 80%;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .card__meta {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .card__id {
      font-size: 0.75rem;
      font-weight: 600;
      color: #888888;
      letter-spacing: 0.05em;
    }
    .card__name {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      text-transform: capitalize;
    }
    .card__types {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
  `]
})
export class PokemonSummaryCardComponent {
  readonly pokemon = input.required<PokemonSummary>();

  readonly paddedId = computed(() =>
    this.pokemon().id.toString().padStart(POKEMON_ID_PAD_LENGTH, '0')
  );
}
