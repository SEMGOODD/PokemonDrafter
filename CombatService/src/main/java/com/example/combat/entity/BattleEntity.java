package com.example.combat.entity;

import com.example.combat.model.BattleMode;
import com.example.combat.model.BattleStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "battles")
@Getter
@Setter
@NoArgsConstructor
public class BattleEntity {

	@Id
	@Column(name = "battle_id")
	private String battleId;

	@Column(name = "red_player_id", nullable = false)
	private String redPlayerId;

	@Column(name = "blue_player_id", nullable = false)
	private String bluePlayerId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private BattleMode mode;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private BattleStatus status;

	@Column(name = "winner_id")
	private String winnerId;

	@Column(name = "turn_number")
	private int turnNumber;

	@Column(name = "battle_data", columnDefinition = "TEXT", nullable = false)
	private String battleData;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	public BattleEntity(String battleId, String redPlayerId, String bluePlayerId,
			BattleMode mode, BattleStatus status, String winnerId,
			int turnNumber, String battleData) {
		this.battleId = battleId;
		this.redPlayerId = redPlayerId;
		this.bluePlayerId = bluePlayerId;
		this.mode = mode;
		this.status = status;
		this.winnerId = winnerId;
		this.turnNumber = turnNumber;
		this.battleData = battleData;
		this.createdAt = Instant.now();
		this.updatedAt = Instant.now();
	}
}
