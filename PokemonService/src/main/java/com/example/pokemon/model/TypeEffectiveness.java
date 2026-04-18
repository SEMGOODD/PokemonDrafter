package com.example.pokemon.model;

import java.util.Map;

public record TypeEffectiveness(
		Map<String, Map<String, Double>> matrix
) {
}
