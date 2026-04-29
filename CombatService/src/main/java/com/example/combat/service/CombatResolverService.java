package com.example.combat.service;

import com.example.combat.client.PokemonServiceClient;
import com.example.combat.model.ActionType;
import com.example.combat.model.Battle;
import com.example.combat.model.BattlePokemon;
import com.example.combat.model.BattleStatus;
import com.example.combat.model.PlayerAction;
import com.example.combat.model.TurnResult;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CombatResolverService {

	private final PokemonServiceClient pokemonClient;
	private Map<String, Map<String, Double>> cachedEffectiveness;

	public CombatResolverService(PokemonServiceClient pokemonClient) {
		this.pokemonClient = pokemonClient;
	}

	public TurnResult resolve(Battle battle) {
		PlayerAction redAction = battle.getRedAction();
		PlayerAction blueAction = battle.getBlueAction();

		if (redAction.actionType() == ActionType.SWITCH) {
			battle.setRedActivePokemon(findById(battle.getRedTeam(), redAction.pokemonId()));
		}
		if (blueAction.actionType() == ActionType.SWITCH) {
			battle.setBlueActivePokemon(findById(battle.getBlueTeam(), blueAction.pokemonId()));
		}

		BattlePokemon red = battle.getRedActivePokemon();
		BattlePokemon blue = battle.getBlueActivePokemon();

		double redF = 0;
		double blueF = 0;
		boolean redKo = false;
		boolean blueKo = false;

		if (red != null && blue != null) {
			Map<String, Map<String, Double>> effectiveness = getTypeEffectiveness();
			redF = computeF(red.getTypes(), blue.getTypes(), effectiveness);
			blueF = computeF(blue.getTypes(), red.getTypes(), effectiveness);

			if (redF > blueF) {
				blue.setKo(true);
				blueKo = true;
			} else if (blueF > redF) {
				red.setKo(true);
				redKo = true;
			} else {
				// Draw: both KO
				red.setKo(true);
				blue.setKo(true);
				redKo = true;
				blueKo = true;
			}
		}

		String turnWinnerId = null;
		if (redKo && !blueKo) turnWinnerId = battle.getBluePlayerId();
		else if (blueKo && !redKo) turnWinnerId = battle.getRedPlayerId();

		checkMatchOver(battle);

		return new TurnResult(
				battle.getTurnNumber(),
				redAction.actionType(),
				blueAction.actionType(),
				red != null ? red.getName() : null,
				blue != null ? blue.getName() : null,
				redF,
				blueF,
				turnWinnerId,
				redKo,
				blueKo
		);
	}

	double computeF(List<String> attackerTypes, List<String> defenderTypes,
			Map<String, Map<String, Double>> effectiveness) {
		double total = 0;
		for (String attackType : attackerTypes) {
			Map<String, Double> row = effectiveness.getOrDefault(attackType, Map.of());
			double product = 1.0;
			for (String defType : defenderTypes) {
				product *= row.getOrDefault(defType, 1.0);
			}
			total += product;
		}
		return total;
	}

	private void checkMatchOver(Battle battle) {
		if (battle.allRedKo() || battle.allBlueKo()) {
			battle.setStatus(BattleStatus.FINISHED);
			if (battle.allRedKo() && !battle.allBlueKo()) {
				battle.setWinnerId(battle.getBluePlayerId());
			} else if (battle.allBlueKo() && !battle.allRedKo()) {
				battle.setWinnerId(battle.getRedPlayerId());
			}
		}
	}

	private BattlePokemon findById(List<BattlePokemon> team, int id) {
		return team.stream()
				.filter(p -> p.getId() == id && !p.isKo())
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Pokemon " + id + " not available"));
	}

	private synchronized Map<String, Map<String, Double>> getTypeEffectiveness() {
		if (cachedEffectiveness == null) {
			cachedEffectiveness = pokemonClient.getTypeEffectiveness();
		}
		return cachedEffectiveness;
	}
}
