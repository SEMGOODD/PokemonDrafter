package com.example.pokemon.service;

import com.example.pokemon.model.Pokemon;
import com.example.pokemon.model.PokemonStats;
import com.example.pokemon.model.PokemonSummary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PokemonSearchServiceTest {

	private static final int CHARIZARD_ID = 6;
	private static final int PIDGEY_ID = 16;
	private static final int MOLTRES_ID = 146;
	private static final int CHARMANDER_ID = 4;
	private static final String TYPE_FIRE = "fire";
	private static final String TYPE_FLYING = "flying";

	private PokemonService pokemonService;
	private TypePokemonListService typeListService;
	private PokemonSearchService searchService;

	@BeforeEach
	void setUp() {
		pokemonService = mock(PokemonService.class);
		typeListService = mock(TypePokemonListService.class);
		searchService = new PokemonSearchService(pokemonService, typeListService);
	}

	@Test
	void searchByNameShortCircuitsAndReturnsSingleSummary() {
		Pokemon charizard = pokemon(CHARIZARD_ID, "charizard", List.of("fire", "flying"));
		when(pokemonService.getByName("charizard")).thenReturn(charizard);

		List<PokemonSummary> result = searchService.search("charizard", null, null, 0, 20);

		assertEquals(1, result.size());
		assertEquals(CHARIZARD_ID, result.getFirst().id());
	}

	@Test
	void searchByTwoTypesReturnsIntersection() {
		when(typeListService.getPokemonIdsForType(TYPE_FIRE))
				.thenReturn(List.of(CHARMANDER_ID, CHARIZARD_ID, MOLTRES_ID));
		when(typeListService.getPokemonIdsForType(TYPE_FLYING))
				.thenReturn(List.of(PIDGEY_ID, CHARIZARD_ID, MOLTRES_ID));
		when(pokemonService.getById(CHARIZARD_ID))
				.thenReturn(pokemon(CHARIZARD_ID, "charizard", List.of("fire", "flying")));
		when(pokemonService.getById(MOLTRES_ID))
				.thenReturn(pokemon(MOLTRES_ID, "moltres", List.of("fire", "flying")));

		List<PokemonSummary> result = searchService.search(null, TYPE_FIRE, TYPE_FLYING, 0, 20);

		assertEquals(2, result.size());
		assertEquals(CHARIZARD_ID, result.get(0).id());
		assertEquals(MOLTRES_ID, result.get(1).id());
	}

	@Test
	void paginationSlicesIdsAndOnlyResolvesPageEntries() {
		List<Integer> twentyFiveFireIds = java.util.stream.IntStream.range(1, 26).boxed().toList();
		when(typeListService.getPokemonIdsForType(TYPE_FIRE)).thenReturn(twentyFiveFireIds);
		for (int id = 21; id <= 25; id++) {
			when(pokemonService.getById(id)).thenReturn(pokemon(id, "p" + id, List.of("fire")));
		}

		List<PokemonSummary> page2 = searchService.search(null, TYPE_FIRE, null, 1, 20);

		assertEquals(5, page2.size());
		assertEquals(21, page2.getFirst().id());
		assertEquals(25, page2.getLast().id());
	}

	@Test
	void emptyFiltersReturnEmptyList() {
		List<PokemonSummary> result = searchService.search(null, null, null, 0, 20);

		assertTrue(result.isEmpty());
	}

	private Pokemon pokemon(int id, String name, List<String> types) {
		return new Pokemon(
				id, name, types,
				0, 0,
				new PokemonStats(0, 0, 0, 0, 0, 0),
				"", "unknown", null
		);
	}
}
