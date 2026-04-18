package com.example.pokemon.service;

import com.example.pokemon.cache.TypeCacheRepository;
import com.example.pokemon.client.PokeApiClient;
import com.example.pokemon.model.TypeEffectiveness;
import tools.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TypeEffectivenessService {

	// Official 18 Pokemon types. PokeAPI also exposes "unknown" and "shadow" but they are not part of the duel mechanics.
	private static final List<String> OFFICIAL_TYPES = List.of(
			"normal", "fighting", "flying", "poison", "ground", "rock",
			"bug", "ghost", "steel", "fire", "water", "grass",
			"electric", "psychic", "ice", "dragon", "dark", "fairy"
	);

	private static final double MULTIPLIER_DOUBLE = 2.0;
	private static final double MULTIPLIER_HALF = 0.5;
	private static final double MULTIPLIER_NONE = 0.0;
	private static final double MULTIPLIER_NEUTRAL = 1.0;

	private static final String FIELD_DAMAGE_RELATIONS = "damage_relations";
	private static final String FIELD_DOUBLE_DAMAGE_TO = "double_damage_to";
	private static final String FIELD_HALF_DAMAGE_TO = "half_damage_to";
	private static final String FIELD_NO_DAMAGE_TO = "no_damage_to";

	private final TypeCacheRepository cache;
	private final PokeApiClient pokeApiClient;

	public TypeEffectivenessService(TypeCacheRepository cache, PokeApiClient pokeApiClient) {
		this.cache = cache;
		this.pokeApiClient = pokeApiClient;
	}

	public TypeEffectiveness getEffectiveness() {
		return cache.findEffectiveness().orElseGet(this::buildAndCache);
	}

	private TypeEffectiveness buildAndCache() {
		Map<String, Map<String, Double>> matrix = new HashMap<>();
		for (String attacker : OFFICIAL_TYPES) {
			matrix.put(attacker, buildRowFor(attacker));
		}
		TypeEffectiveness effectiveness = new TypeEffectiveness(matrix);
		cache.saveEffectiveness(effectiveness);
		return effectiveness;
	}

	private Map<String, Double> buildRowFor(String attacker) {
		JsonNode typeNode = pokeApiClient.fetchType(attacker);
		JsonNode damageRelations = typeNode.get(FIELD_DAMAGE_RELATIONS);

		Map<String, Double> row = new HashMap<>();
		for (String defender : OFFICIAL_TYPES) {
			row.put(defender, MULTIPLIER_NEUTRAL);
		}
		applyMultiplier(damageRelations.get(FIELD_DOUBLE_DAMAGE_TO), row, MULTIPLIER_DOUBLE);
		applyMultiplier(damageRelations.get(FIELD_HALF_DAMAGE_TO), row, MULTIPLIER_HALF);
		applyMultiplier(damageRelations.get(FIELD_NO_DAMAGE_TO), row, MULTIPLIER_NONE);
		return row;
	}

	private void applyMultiplier(JsonNode targetTypes, Map<String, Double> row, double multiplier) {
		if (targetTypes == null) {
			return;
		}
		for (JsonNode entry : targetTypes) {
			String defender = entry.get("name").asString();
			if (row.containsKey(defender)) {
				row.put(defender, multiplier);
			}
		}
	}
}
