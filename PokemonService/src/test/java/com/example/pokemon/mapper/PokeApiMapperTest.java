package com.example.pokemon.mapper;

import com.example.pokemon.model.Pokemon;
import com.example.pokemon.model.PokemonSummary;
import com.example.pokemon.model.Species;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PokeApiMapperTest {

	private static final String POKEMON_JSON = """
			{
			  "id": 25,
			  "name": "pikachu",
			  "height": 4,
			  "weight": 60,
			  "sprites": { "front_default": "https://example.test/pikachu.png" },
			  "species": { "name": "pikachu", "url": "https://pokeapi.co/api/v2/pokemon-species/25/" },
			  "types": [
			    { "slot": 1, "type": { "name": "electric" } }
			  ],
			  "stats": [
			    { "base_stat": 35, "stat": { "name": "hp" } },
			    { "base_stat": 55, "stat": { "name": "attack" } },
			    { "base_stat": 40, "stat": { "name": "defense" } },
			    { "base_stat": 50, "stat": { "name": "special-attack" } },
			    { "base_stat": 50, "stat": { "name": "special-defense" } },
			    { "base_stat": 90, "stat": { "name": "speed" } }
			  ]
			}
			""";

	private static final String MEGA_POKEMON_JSON = """
			{
			  "id": 10035,
			  "name": "charizard-mega-y",
			  "height": 17,
			  "weight": 1005,
			  "sprites": { "front_default": "https://example.test/megaY.png" },
			  "species": { "name": "charizard", "url": "https://pokeapi.co/api/v2/pokemon-species/6/" },
			  "types": [
			    { "slot": 1, "type": { "name": "fire" } },
			    { "slot": 2, "type": { "name": "flying" } }
			  ],
			  "stats": [
			    { "base_stat": 78, "stat": { "name": "hp" } },
			    { "base_stat": 104, "stat": { "name": "attack" } },
			    { "base_stat": 78, "stat": { "name": "defense" } },
			    { "base_stat": 159, "stat": { "name": "special-attack" } },
			    { "base_stat": 115, "stat": { "name": "special-defense" } },
			    { "base_stat": 100, "stat": { "name": "speed" } }
			  ]
			}
			""";

	private static final String SPECIES_JSON = """
			{
			  "habitat": { "name": "forest" },
			  "flavor_text_entries": [
			    { "flavor_text": "When several\\nof these POKeMON\\fgather", "language": { "name": "en" } },
			    { "flavor_text": "FR text", "language": { "name": "fr" } }
			  ]
			}
			""";

	private static final String SPECIES_NO_HABITAT_JSON = """
			{
			  "habitat": null,
			  "flavor_text_entries": []
			}
			""";

	private static final String TYPE_POKEMON_LIST_JSON = """
			{
			  "pokemon": [
			    { "pokemon": { "name": "pikachu", "url": "https://pokeapi.co/api/v2/pokemon/25/" }, "slot": 1 },
			    { "pokemon": { "name": "raichu", "url": "https://pokeapi.co/api/v2/pokemon/26/" }, "slot": 1 }
			  ]
			}
			""";

	private static final int PIKACHU_SPECIES_ID = 25;
	private static final int CHARIZARD_SPECIES_ID = 6;

	private ObjectMapper objectMapper;
	private PokeApiMapper mapper;

	@BeforeEach
	void setUp() {
		objectMapper = new ObjectMapper();
		mapper = new PokeApiMapper();
	}

	@Test
	void mapsFullPokemonUsingProvidedSpecies() {
		JsonNode pokemonNode = objectMapper.readTree(POKEMON_JSON);
		Species species = new Species(PIKACHU_SPECIES_ID, "Lights up dark places.", "forest");

		Pokemon pokemon = mapper.toPokemon(pokemonNode, species);

		assertEquals(25, pokemon.id());
		assertEquals("pikachu", pokemon.name());
		assertEquals(List.of("electric"), pokemon.types());
		assertEquals(4, pokemon.height());
		assertEquals(60, pokemon.weight());
		assertEquals(35, pokemon.stats().hp());
		assertEquals(90, pokemon.stats().speed());
		assertEquals("Lights up dark places.", pokemon.description());
		assertEquals("forest", pokemon.habitat());
		assertEquals("https://example.test/pikachu.png", pokemon.sprite());
	}

	@Test
	void summaryDoesNotRequireSpecies() {
		JsonNode pokemonNode = objectMapper.readTree(POKEMON_JSON);

		PokemonSummary summary = mapper.toSummary(pokemonNode);

		assertEquals(25, summary.id());
		assertEquals("pikachu", summary.name());
		assertEquals(List.of("electric"), summary.types());
		assertEquals("https://example.test/pikachu.png", summary.sprite());
	}

	@Test
	void toSpeciesFlattensFlavorTextWhitespace() {
		JsonNode speciesNode = objectMapper.readTree(SPECIES_JSON);

		Species species = mapper.toSpecies(PIKACHU_SPECIES_ID, speciesNode);

		assertEquals(PIKACHU_SPECIES_ID, species.id());
		assertEquals("When several of these POKeMON gather", species.description());
		assertEquals("forest", species.habitat());
	}

	@Test
	void toSpeciesFallsBackToUnknownHabitatAndEmptyDescription() {
		JsonNode speciesNode = objectMapper.readTree(SPECIES_NO_HABITAT_JSON);

		Species species = mapper.toSpecies(99, speciesNode);

		assertEquals("unknown", species.habitat());
		assertEquals("", species.description());
	}

	@Test
	void extractSpeciesIdFromBaseFormPokemon() {
		JsonNode pokemonNode = objectMapper.readTree(POKEMON_JSON);

		int speciesId = mapper.extractSpeciesIdFromPokemonNode(pokemonNode);

		assertEquals(PIKACHU_SPECIES_ID, speciesId);
	}

	@Test
	void extractSpeciesIdFromAlternateFormPokemonResolvesToBaseSpecies() {
		JsonNode pokemonNode = objectMapper.readTree(MEGA_POKEMON_JSON);

		int speciesId = mapper.extractSpeciesIdFromPokemonNode(pokemonNode);

		assertEquals(CHARIZARD_SPECIES_ID, speciesId);
	}

	@Test
	void extractSpeciesIdFailsLoudlyOnMalformedUrl() {
		JsonNode malformed = objectMapper.readTree("{\"species\": {\"url\": \"not-a-url\"}}");

		assertThrows(IllegalStateException.class, () -> mapper.extractSpeciesIdFromPokemonNode(malformed));
	}

	@Test
	void extractsPokemonIdsFromTypeListUrls() {
		JsonNode typeNode = objectMapper.readTree(TYPE_POKEMON_LIST_JSON);

		List<Integer> ids = mapper.extractPokemonIdsFromTypeNode(typeNode);

		assertEquals(List.of(25, 26), ids);
	}

	@Test
	void returnsNullSpriteWhenAbsent() {
		String noSpriteJson = POKEMON_JSON.replace(
				"\"sprites\": { \"front_default\": \"https://example.test/pikachu.png\" }",
				"\"sprites\": { \"front_default\": null }"
		);
		JsonNode pokemonNode = objectMapper.readTree(noSpriteJson);
		Species species = new Species(PIKACHU_SPECIES_ID, "", "unknown");

		Pokemon pokemon = mapper.toPokemon(pokemonNode, species);

		assertNull(pokemon.sprite());
	}
}
