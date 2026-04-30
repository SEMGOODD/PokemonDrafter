package com.example.combat.model;

import java.util.List;

public record TeamResponse(
		String teamId,
		String name,
		String playerId,
		List<TeamPokemonResponse> pokemons
) {}