package com.example.pokemon.mapper;

import com.example.pokemon.model.Pokemon;
import com.example.pokemon.model.PokemonStats;
import com.example.pokemon.model.PokemonSummary;
import com.example.pokemon.model.Species;
import tools.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class PokeApiMapper {

	private static final String LANGUAGE_EN = "en";
	private static final String HABITAT_UNKNOWN = "unknown";
	private static final String DESCRIPTION_UNKNOWN = "";

	private static final String STAT_HP = "hp";
	private static final String STAT_ATTACK = "attack";
	private static final String STAT_DEFENSE = "defense";
	private static final String STAT_SPECIAL_ATTACK = "special-attack";
	private static final String STAT_SPECIAL_DEFENSE = "special-defense";
	private static final String STAT_SPEED = "speed";

	// PokeAPI returns flavor_text with line breaks and form feeds embedded; we flatten them for the Dex display.
	private static final Pattern WHITESPACE_NORMALISER = Pattern.compile("[\\f\\n\\r]+");
	private static final String WHITESPACE_REPLACEMENT = " ";

	// PokeAPI URLs follow the form .../<resource>/{id}/ ; these regexes extract the id segment.
	private static final Pattern POKEMON_URL_ID = Pattern.compile("/pokemon/(\\d+)/?$");
	private static final Pattern SPECIES_URL_ID = Pattern.compile("/pokemon-species/(\\d+)/?$");

	public Pokemon toPokemon(JsonNode pokemonNode, Species species) {
		int id = pokemonNode.get("id").asInt();
		String name = pokemonNode.get("name").asString();
		List<String> types = extractTypes(pokemonNode);
		int height = pokemonNode.get("height").asInt();
		int weight = pokemonNode.get("weight").asInt();
		PokemonStats stats = extractStats(pokemonNode);
		String sprite = extractSprite(pokemonNode);
		return new Pokemon(id, name, types, height, weight, stats, species.description(), species.habitat(), sprite);
	}

	public PokemonSummary toSummary(JsonNode pokemonNode) {
		int id = pokemonNode.get("id").asInt();
		String name = pokemonNode.get("name").asString();
		List<String> types = extractTypes(pokemonNode);
		String sprite = extractSprite(pokemonNode);
		return new PokemonSummary(id, name, types, sprite);
	}

	public Species toSpecies(int speciesId, JsonNode speciesNode) {
		return new Species(speciesId, extractEnglishFlavorText(speciesNode), extractHabitat(speciesNode));
	}

	public int extractSpeciesIdFromPokemonNode(JsonNode pokemonNode) {
		String url = pokemonNode.path("species").path("url").asString();
		Matcher matcher = SPECIES_URL_ID.matcher(url);
		if (!matcher.find()) {
			throw new IllegalStateException("Cannot extract species id from URL: " + url);
		}
		return Integer.parseInt(matcher.group(1));
	}

	public List<Integer> extractPokemonIdsFromTypeNode(JsonNode typeNode) {
		List<Integer> ids = new ArrayList<>();
		for (JsonNode entry : typeNode.get("pokemon")) {
			String url = entry.get("pokemon").get("url").asString();
			Matcher matcher = POKEMON_URL_ID.matcher(url);
			if (matcher.find()) {
				ids.add(Integer.parseInt(matcher.group(1)));
			}
		}
		return ids;
	}

	private List<String> extractTypes(JsonNode pokemonNode) {
		List<String> types = new ArrayList<>();
		for (JsonNode slot : pokemonNode.get("types")) {
			types.add(slot.get("type").get("name").asString());
		}
		return types;
	}

	private PokemonStats extractStats(JsonNode pokemonNode) {
		int hp = 0;
		int attack = 0;
		int defense = 0;
		int specialAttack = 0;
		int specialDefense = 0;
		int speed = 0;
		for (JsonNode entry : pokemonNode.get("stats")) {
			int value = entry.get("base_stat").asInt();
			String statName = entry.get("stat").get("name").asString();
			switch (statName) {
				case STAT_HP -> hp = value;
				case STAT_ATTACK -> attack = value;
				case STAT_DEFENSE -> defense = value;
				case STAT_SPECIAL_ATTACK -> specialAttack = value;
				case STAT_SPECIAL_DEFENSE -> specialDefense = value;
				case STAT_SPEED -> speed = value;
				default -> {
				}
			}
		}
		return new PokemonStats(hp, attack, defense, specialAttack, specialDefense, speed);
	}

	private String extractSprite(JsonNode pokemonNode) {
		JsonNode sprite = pokemonNode.path("sprites").path("front_default");
		return sprite.isMissingNode() || sprite.isNull() ? null : sprite.asString();
	}

	private String extractEnglishFlavorText(JsonNode speciesNode) {
		for (JsonNode entry : speciesNode.path("flavor_text_entries")) {
			if (LANGUAGE_EN.equals(entry.path("language").path("name").asString())) {
				String raw = entry.path("flavor_text").asString();
				return WHITESPACE_NORMALISER.matcher(raw).replaceAll(WHITESPACE_REPLACEMENT).trim();
			}
		}
		return DESCRIPTION_UNKNOWN;
	}

	private String extractHabitat(JsonNode speciesNode) {
		JsonNode habitat = speciesNode.path("habitat");
		if (habitat.isMissingNode() || habitat.isNull()) {
			return HABITAT_UNKNOWN;
		}
		return habitat.path("name").asString(HABITAT_UNKNOWN);
	}
}
