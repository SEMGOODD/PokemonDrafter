import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PokemonSummary } from '../../../shared/types/pokemon.types';
import { TypeBadgeComponent } from '../../../shared/ui/type-badge/type-badge.component';

const POKEMON_ID_PAD_LENGTH = 3;

@Component({
  selector: 'app-pokemon-summary-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TypeBadgeComponent],
  templateUrl: './pokemon-summary-card.component.html',
  styleUrl: './pokemon-summary-card.component.css'
})
export class PokemonSummaryCardComponent {
  readonly pokemon = input.required<PokemonSummary>();

  readonly paddedId = computed(() =>
    this.pokemon().id.toString().padStart(POKEMON_ID_PAD_LENGTH, '0')
  );
}