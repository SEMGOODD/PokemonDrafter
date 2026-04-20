package com.example.combat.model;

import java.util.List;

public record CreateBattleRequest(
		String redPlayerId,
		String bluePlayerId,
		BattleMode mode,
		List<Integer> redTeam,
		List<Integer> blueTeam
) {}
