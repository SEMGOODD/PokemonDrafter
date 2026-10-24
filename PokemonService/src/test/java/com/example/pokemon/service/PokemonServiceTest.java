package com.example.pokemon.service;

import com.example.pokemon.cache.PokemonCacheRepository;
import com.example.pokemon.client.PokeApiClient;
import com.example.pokemon.mapper.PokeApiMapper;
import com.example.pokemon.model.Pokemon;
import com.example.pokemon.model.PokemonStats;
import com.example.pokemon.model.Species;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PokemonServiceTest {

	private static final int PIKACHU_ID = 25;
	private static final int PIKACHU_SPECIES_ID = 25;
	private static final String PIKACHU_NAME = "pikachu";

	private PokemonCacheRepository cache;
	private PokeApiClient client;
	private PokeApiMapper mapper;
	private SpeciesService speciesService;
	private PokemonNameIndexService nameIndexService;
	private PokemonService service;
	private Pokemon pikachu;
	private Species pikachuSpecies;

	@BeforeEach
	void setUp() {
		cache = mock(PokemonCacheRepository.class);
		client = mock(PokeApiClient.class);
		mapper = mock(PokeApiMapper.class);
		speciesService = mock(SpeciesService.class);
		nameIndexService = mock(PokemonNameIndexService.class);
		when(nameIndexService.getFrenchName(anyInt())).thenReturn(null);
		service = new PokemonService(cache, client, mapper, speciesService, nameIndexService);

		pikachuSpecies = new Species(PIKACHU_SPECIES_ID, "Lights up dark places.", "forest");
		pikachu = new Pokemon(
				PIKACHU_ID, PIKACHU_NAME, List.of("electric"),
				4, 60,
				new PokemonStats(35, 55, 40, 50, 50, 90),
				pikachuSpecies.description(), pikachuSpecies.habitat(),
				"https://example.test/pikachu.png");
	}

	@Test
	void returnsCachedPokemonWithoutCallingPokeApi() {
		when(cache.findById(PIKACHU_ID)).thenReturn(Optional.of(pikachu));

		Pokemon result = service.getById(PIKACHU_ID);

		assertSame(pikachu, result);
		verify(client, never()).fetchPokemon(any());
		verify(speciesService, never()).getById(any(Integer.class));
	}

	@Test
	void fetchesPokemonAndDelegatesSpeciesLookupOnCacheMiss() {
		when(cache.findById(PIKACHU_ID)).thenReturn(Optional.empty());
		var pokemonNode = new ObjectMapper().readTree("{\"id\":25,\"name\":\"pikachu\"}");
		when(client.fetchPokemon(String.valueOf(PIKACHU_ID))).thenReturn(pokemonNode);
		when(mapper.extractSpeciesIdFromPokemonNode(pokemonNode)).thenReturn(PIKACHU_SPECIES_ID);
		when(speciesService.getById(PIKACHU_SPECIES_ID)).thenReturn(pikachuSpecies);
		when(mapper.toPokemon(pokemonNode, pikachuSpecies)).thenReturn(pikachu);

		Pokemon result = service.getById(PIKACHU_ID);

		assertSame(pikachu, result);
		verify(speciesService, times(1)).getById(PIKACHU_SPECIES_ID);
		verify(cache, times(1)).save(pikachu);
	}

	@Test
	void resolvesNameViaCacheIndexBeforeFallingBackToPokeApi() {
		when(cache.findIdByName(PIKACHU_NAME)).thenReturn(Optional.of(PIKACHU_ID));
		when(cache.findById(PIKACHU_ID)).thenReturn(Optional.of(pikachu));

		Pokemon result = service.getByName(PIKACHU_NAME);

		assertEquals(pikachu, result);
		verify(client, never()).fetchPokemon(any());
		verify(speciesService, never()).getById(any(Integer.class));
	}

	@Test
	void returnsPokemonWithFrenchNameWhenIndexKnowsIt() {
		when(cache.findById(PIKACHU_ID)).thenReturn(Optional.of(pikachu));
		when(nameIndexService.getFrenchName(PIKACHU_ID)).thenReturn("Pikachu");

		Pokemon result = service.getById(PIKACHU_ID);

		assertEquals("Pikachu", result.name());
		assertEquals(PIKACHU_ID, result.id());
		assertEquals(pikachu.stats(), result.stats());
		assertEquals(pikachu.sprite(), result.sprite());
	}

	@Test
	void keepsEnglishNameWhenFrenchNameMissingOrBlank() {
		when(cache.findById(PIKACHU_ID)).thenReturn(Optional.of(pikachu));
		when(nameIndexService.getFrenchName(PIKACHU_ID)).thenReturn("");

		Pokemon result = service.getById(PIKACHU_ID);

		assertEquals(PIKACHU_NAME, result.name());
	}

	@Test
	void fetchesByNameWhenNameNotInCache() {
		when(cache.findIdByName(PIKACHU_NAME)).thenReturn(Optional.empty());
		var pokemonNode = new ObjectMapper().readTree("{\"id\":25,\"name\":\"pikachu\"}");
		when(client.fetchPokemon(eq(PIKACHU_NAME))).thenReturn(pokemonNode);
		when(mapper.extractSpeciesIdFromPokemonNode(pokemonNode)).thenReturn(PIKACHU_SPECIES_ID);
		when(speciesService.getById(PIKACHU_SPECIES_ID)).thenReturn(pikachuSpecies);
		when(mapper.toPokemon(pokemonNode, pikachuSpecies)).thenReturn(pikachu);

		Pokemon result = service.getByName(PIKACHU_NAME);

		assertSame(pikachu, result);
		verify(cache).save(pikachu);
	}
}
