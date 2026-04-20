package com.example.combat.model;

import java.util.List;

public record PokemonData(
		int id,
		String name,
		List<String> types,
		String sprite
) {}
