package com.example.combat.model;

import java.util.List;

public record DraftPickRequest(
		String playerId,
		List<Integer> pokemonIds
) {}
