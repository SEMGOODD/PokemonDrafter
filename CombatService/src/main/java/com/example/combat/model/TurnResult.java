package com.example.combat.model;

public record TurnResult(
		int turnNumber,
		ActionType redActionType,
		ActionType blueActionType,
		String redPokemonName,
		String bluePokemonName,
		double redScore,
		double blueScore,
		String winnerId,
		boolean redKo,
		boolean blueKo
) {}
