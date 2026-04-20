package com.example.combat.model;

public record PlayerAction(
		String playerId,
		ActionType actionType,
		Integer pokemonId
) {}
