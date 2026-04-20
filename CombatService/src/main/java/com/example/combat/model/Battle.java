package com.example.combat.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class Battle {

	// Draft pick order: {team (0=RED, 1=BLUE), count}
	public static final int[][] DRAFT_ORDER = {
		{0, 1}, {1, 2}, {0, 1}, {1, 1}, {0, 1},
		{1, 1}, {0, 1}, {1, 1}, {0, 1}, {1, 1}, {0, 1}
	};

	private String battleId;
	private BattleMode mode;
	private BattleStatus status;
	private String redPlayerId;
	private String bluePlayerId;

	private List<BattlePokemon> redTeam = new ArrayList<>();
	private List<BattlePokemon> blueTeam = new ArrayList<>();
	private List<BattlePokemon> draftPool = new ArrayList<>();
	private int draftTurnIndex = 0;

	private BattlePokemon redActivePokemon;
	private BattlePokemon blueActivePokemon;
	private PlayerAction redAction;
	private PlayerAction blueAction;
	private int turnNumber = 0;
	private Instant turnDeadline;
	private String winnerId;
	private List<TurnResult> turnHistory = new ArrayList<>();

	public Battle(String battleId, BattleMode mode, String redPlayerId, String bluePlayerId) {
		this.battleId = battleId;
		this.mode = mode;
		this.redPlayerId = redPlayerId;
		this.bluePlayerId = bluePlayerId;
		this.status = BattleStatus.DRAFT_PHASE;
	}

	public Team teamOf(String playerId) {
		if (redPlayerId.equals(playerId)) return Team.RED;
		if (bluePlayerId.equals(playerId)) return Team.BLUE;
		throw new IllegalArgumentException("Unknown player: " + playerId);
	}

	public boolean bothActed() {
		return redAction != null && blueAction != null;
	}

	public boolean allRedKo() {
		return redTeam.stream().allMatch(BattlePokemon::isKo);
	}

	public boolean allBlueKo() {
		return blueTeam.stream().allMatch(BattlePokemon::isKo);
	}
}
