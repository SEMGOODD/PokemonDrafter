import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, startWith } from 'rxjs';

import { PokemonApiService } from '../../../core/api/pokemon-api.service';
import { POKEMON_TYPES } from '../../../shared/constants/pokemon-types.const';
import { PokemonSearchRequest, PokemonSummary } from '../../../shared/types/pokemon.types';
import { PageFrameComponent } from '../../../shared/ui/page-frame/page-frame.component';
import { PokemonSummaryCardComponent } from '../pokemon-summary-card/pokemon-summary-card.component';

const PAGE_SIZE = 20;
const NAME_DEBOUNCE_MS = 300;
const FIRST_PAGE = 0;

@Component({
  selector: 'app-pokedex-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageFrameComponent, PokemonSummaryCardComponent],
  templateUrl: './pokedex-search.component.html',
  styleUrl: './pokedex-search.component.scss'
})
export class PokedexSearchComponent {
  private readonly pokemonApi = inject(PokemonApiService);

  readonly types = POKEMON_TYPES;
  readonly nameControl = new FormControl<string>('', { nonNullable: true });
  readonly type1Control = new FormControl<string>('', { nonNullable: true });
  readonly type2Control = new FormControl<string>('', { nonNullable: true });
  readonly page = signal(FIRST_PAGE);

  private readonly debouncedName = toSignal(
    this.nameControl.valueChanges.pipe(
      startWith(this.nameControl.value),
      debounceTime(NAME_DEBOUNCE_MS)
    ),
    { initialValue: this.nameControl.value }
  );

  private readonly type1Signal = toSignal(
    this.type1Control.valueChanges.pipe(startWith(this.type1Control.value)),
    { initialValue: this.type1Control.value }
  );

  private readonly type2Signal = toSignal(
    this.type2Control.valueChanges.pipe(startWith(this.type2Control.value)),
    { initialValue: this.type2Control.value }
  );

  private readonly filtersFingerprint = computed(() =>
    `${this.debouncedName()}|${this.type1Signal()}|${this.type2Signal()}`
  );

  readonly searchResource = rxResource<PokemonSummary[], PokemonSearchRequest>({
    params: () => ({
      name: this.debouncedName(),
      type1: this.type1Signal() || undefined,
      type2: this.type2Signal() || undefined,
      page: this.page(),
      pageSize: PAGE_SIZE
    }),
    stream: ({ params }) => this.pokemonApi.search(params),
    defaultValue: []
  });

  readonly results = this.searchResource.value;
  readonly isLoading = this.searchResource.isLoading;
  readonly error = this.searchResource.error;

  readonly canGoPrev = computed(() => this.page() > FIRST_PAGE);
  readonly canGoNext = computed(() =>
    !this.isLoading() && this.results().length === PAGE_SIZE
  );

  constructor() {
    effect(() => {
      this.filtersFingerprint();
      this.page.set(FIRST_PAGE);
    });
  }

  goPrev(): void {
    if (this.canGoPrev()) {
      this.page.update(p => p - 1);
    }
  }

  goNext(): void {
    if (this.canGoNext()) {
      this.page.update(p => p + 1);
    }
  }
}
