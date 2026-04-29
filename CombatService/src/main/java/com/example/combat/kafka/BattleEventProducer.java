package com.example.combat.kafka;

import com.example.combat.model.Battle;
import com.example.combat.model.TurnResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class BattleEventProducer {

	private static final String TOPIC_BATTLE = "battle";
	private static final String TOPIC_CHAT = "chat";
	private static final String TOPIC_LOGS = "logs-service";

	private final KafkaTemplate<String, String> kafkaTemplate;
	private final ObjectMapper objectMapper;

	public BattleEventProducer(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
		this.kafkaTemplate = kafkaTemplate;
		this.objectMapper = objectMapper;
	}

	public void publishBattleStarted(Battle battle) {
		publish(TOPIC_BATTLE, Map.of(
				"eventType", "BATTLE_STARTED",
				"battleId", battle.getBattleId(),
				"mode", battle.getMode().name(),
				"redPlayerId", battle.getRedPlayerId(),
				"bluePlayerId", battle.getBluePlayerId()));
		publish(TOPIC_LOGS, Map.of(
				"eventType", "BATTLE_STARTED",
				"battleId", battle.getBattleId()));
	}

	public void publishTurnResult(Battle battle, TurnResult result) {
		publish(TOPIC_BATTLE, Map.of(
				"eventType", "TURN_RESOLVED",
				"battleId", battle.getBattleId(),
				"turnNumber", result.turnNumber(),
				"winnerId", result.winnerId() != null ? result.winnerId() : "DRAW"));

		String message = buildChatMessage(battle, result);
		publish(TOPIC_CHAT, Map.of(
				"battleId", battle.getBattleId(),
				"isBot", true,
				"message", message));
	}

	public void publishBattleEnded(Battle battle) {
		String winnerId = battle.getWinnerId() != null ? battle.getWinnerId() : "DRAW";
		publish(TOPIC_BATTLE, Map.of(
				"eventType", "BATTLE_ENDED",
				"battleId", battle.getBattleId(),
				"winnerId", winnerId,
				"redPlayerId", battle.getRedPlayerId(),
				"bluePlayerId", battle.getBluePlayerId()));
		publish(TOPIC_LOGS, Map.of(
				"eventType", "BATTLE_ENDED",
				"battleId", battle.getBattleId(),
				"winnerId", winnerId));
	}

	public void publishForfeit(Battle battle, String forfeitingPlayerId) {
		publish(TOPIC_BATTLE, Map.of(
				"eventType", "FORFEIT",
				"battleId", battle.getBattleId(),
				"forfeitingPlayerId", forfeitingPlayerId,
				"winnerId", battle.getWinnerId()));
		publish(TOPIC_CHAT, Map.of(
				"battleId", battle.getBattleId(),
				"isBot", true,
				"message", "Le joueur " + forfeitingPlayerId + " a déclaré forfait."));
	}

	private String buildChatMessage(Battle battle, TurnResult result) {
		String redAction = result.redPokemonName() != null ? result.redPokemonName() : "—";
		String blueAction = result.bluePokemonName() != null ? result.bluePokemonName() : "—";
		String winner = result.winnerId() != null
				? (result.winnerId().equals(battle.getRedPlayerId()) ? "Rouge" : "Bleu")
				: "Égalité";

		return String.format("Tour %d — Rouge: %s (F=%.2f) vs Bleu: %s (F=%.2f). Vainqueur du tour: %s.",
				result.turnNumber(), redAction, result.redScore(), blueAction, result.blueScore(), winner);
	}

	private void publish(String topic, Object payload) {
		try {
			kafkaTemplate.send(topic, objectMapper.writeValueAsString(payload));
		} catch (Exception e) {
			System.out.println("Erreur envoie message Kafka : " + e.getMessage());
		}
	}
}
