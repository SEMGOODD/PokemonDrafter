package com.example.pokemon.model;

import java.util.List;

public record PokemonSummary(
		int id,
		String name,
		List<String> types,
		String sprite
) {
}
