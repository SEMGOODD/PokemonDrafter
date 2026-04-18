package com.example.pokemon.model;

import java.util.List;

public record Pokemon(
		int id,
		String name,
		List<String> types,
		int height,
		int weight,
		PokemonStats stats,
		String description,
		String habitat,
		String sprite
) {
}
