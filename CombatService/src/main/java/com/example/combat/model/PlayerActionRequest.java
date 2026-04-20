package com.example.combat.model;

public record PlayerActionRequest(
		String playerId,
		ActionType actionType,
		Integer pokemonId
) {}
