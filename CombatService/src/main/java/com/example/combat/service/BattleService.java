package com.example.combat.service;

import com.example.combat.client.PokemonServiceClient;
import com.example.combat.entity.BattleEntity;
import com.example.combat.kafka.BattleEventProducer;
import com.example.combat.model.ActionType;
import com.example.combat.model.Battle;
import com.example.combat.model.BattlePokemon;
import com.example.combat.model.BattleStatus;
import com.example.combat.model.CreateBattleRequest;
import com.example.combat.model.DraftPickRequest;
import com.example.combat.model.ForfeitRequest;
import com.example.combat.model.PlayerAction;
import com.example.combat.model.PlayerActionRequest;
import com.example.combat.model.Team;
import com.example.combat.model.TurnResult;
import com.example.combat.repository.BattleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.IntStream;

@Service
public class BattleService {

	private static final int TURN_SECONDS = 90;
	private static final int POKEMON_POOL_SIZE = 12;
	private static final int TEAM_SIZE = 6;
	private static final int MAX_POKEMON_ID = 151;

	private final ConcurrentHashMap<String, Battle> battles = new ConcurrentHashMap<>();
	private final PokemonServiceClient pokemonClient;
	private final CombatResolverService resolver;
	private final BattleEventProducer producer;
	private final BattleRepository battleRepository;
	private final ObjectMapper objectMapper;
	private final Random random = new Random();

	public BattleService(PokemonServiceClient pokemonClient,
			CombatResolverService resolver,
			BattleEventProducer producer,
			BattleRepository battleRepository,
			ObjectMapper objectMapper) {
		this.pokemonClient = pokemonClient;
		this.resolver = resolver;
		this.producer = producer;
		this.battleRepository = battleRepository;
		this.objectMapper = objectMapper;
	}

	public Battle createBattle(CreateBattleRequest request) {
		String battleId = UUID.randomUUID().toString();
		Battle battle = new Battle(battleId, request.mode(), request.redPlayerId(), request.bluePlayerId());

		switch (request.mode()) {
			case DRAFT -> {
				List<BattlePokemon> pool = randomPokemonPool(POKEMON_POOL_SIZE);
				battle.setDraftPool(new ArrayList<>(pool));
			}
			case BUILT -> {
				battle.setRedTeam(fetchTeam(request.redTeam()));
				battle.setBlueTeam(fetchTeam(request.blueTeam()));
				startBattle(battle, false);
			}
			case RANDOM -> {
				List<BattlePokemon> pool = randomPokemonPool(POKEMON_POOL_SIZE);
				battle.setRedTeam(new ArrayList<>(pool.subList(0, TEAM_SIZE)));
				battle.setBlueTeam(new ArrayList<>(pool.subList(TEAM_SIZE, POKEMON_POOL_SIZE)));
				startBattle(battle, true);
			}
		}

		battles.put(battleId, battle);
		persist(battle);
		producer.publishBattleStarted(battle);
		return battle;
	}

	public Battle getBattle(String battleId) {
		return battles.computeIfAbsent(battleId, id -> battleRepository.findById(id)
				.map(this::deserialize)
				.orElseThrow(() -> new IllegalArgumentException("Battle not found: " + id)));
	}

	public List<TurnResult> getTurns(String battleId) {
		return getBattle(battleId).getTurnHistory();
	}

	public TurnResult getTurn(String battleId, int turnNumber) {
		return getBattle(battleId).getTurnHistory().stream()
				.filter(t -> t.turnNumber() == turnNumber)
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Turn " + turnNumber + " not found"));
	}

	public List<Battle> getBattlesByPlayer(String playerId) {
		return battleRepository.findFinishedByPlayer(BattleStatus.FINISHED, playerId)
				.stream()
				.map(this::deserialize)
				.toList();
	}

	public List<Battle> getActiveBattlesByPlayer(String playerId) {
		return battleRepository.findActiveByPlayer(BattleStatus.FINISHED, playerId)
				.stream()
				.map(this::deserialize)
				.toList();
	}

	public Battle draftPick(String battleId, DraftPickRequest request) {
		Battle battle = getBattle(battleId);
		synchronized (battle) {
			if (battle.getStatus() != BattleStatus.DRAFT_PHASE) {
				throw new IllegalStateException("Battle is not in draft phase");
			}

			int turnIdx = battle.getDraftTurnIndex();
			if (turnIdx >= Battle.DRAFT_ORDER.length) {
				throw new IllegalStateException("Draft is complete");
			}

			int[] turn = Battle.DRAFT_ORDER[turnIdx];
			Team expectedTeam = turn[0] == 0 ? Team.RED : Team.BLUE;
			int expectedCount = turn[1];
			Team requestingTeam = battle.teamOf(request.playerId());

			if (requestingTeam != expectedTeam) {
				throw new IllegalStateException("It is not your turn to pick");
			}
			if (request.pokemonIds().size() != expectedCount) {
				throw new IllegalArgumentException(
						"Expected " + expectedCount + " pick(s), got " + request.pokemonIds().size());
			}

			List<BattlePokemon> pool = battle.getDraftPool();
			List<BattlePokemon> picks = new ArrayList<>();
			for (int pokemonId : request.pokemonIds()) {
				BattlePokemon picked = pool.stream()
						.filter(p -> p.getId() == pokemonId)
						.findFirst()
						.orElseThrow(() -> new IllegalArgumentException("Pokemon " + pokemonId + " not in draft pool"));
				picks.add(picked);
				pool.remove(picked);
			}

			if (requestingTeam == Team.RED) {
				battle.getRedTeam().addAll(picks);
			} else {
				battle.getBlueTeam().addAll(picks);
			}

			battle.setDraftTurnIndex(turnIdx + 1);

			if (battle.getDraftTurnIndex() >= Battle.DRAFT_ORDER.length) {
				startBattle(battle, false);
			}
			persist(battle);
		}
		return battle;
	}

	public Battle submitAction(String battleId, PlayerActionRequest request) {
		Battle battle = getBattle(battleId);
		synchronized (battle) {
			if (battle.getStatus() != BattleStatus.IN_PROGRESS) {
				throw new IllegalStateException("Battle is not in progress");
			}
			if (Instant.now().isAfter(battle.getTurnDeadline())) {
				throw new IllegalStateException("Turn timer has expired");
			}

			Team team = battle.teamOf(request.playerId());
			BattlePokemon active = team == Team.RED
					? battle.getRedActivePokemon()
					: battle.getBlueActivePokemon();

			if (request.actionType() == ActionType.STAY && (active == null || active.isKo())) {
				throw new IllegalStateException("Cannot STAY: no active or active Pokemon is KO");
			}
			if (request.actionType() == ActionType.SWITCH && request.pokemonId() == null) {
				throw new IllegalArgumentException("pokemonId required for SWITCH action");
			}

			PlayerAction action = new PlayerAction(request.playerId(), request.actionType(), request.pokemonId());
			if (team == Team.RED) {
				battle.setRedAction(action);
			} else {
				battle.setBlueAction(action);
			}

			if (battle.bothActed()) {
				resolveTurn(battle);
			}
		}
		return battle;
	}

	public Battle forfeit(String battleId, ForfeitRequest request) {
		Battle battle = getBattle(battleId);
		synchronized (battle) {
			if (battle.getStatus() == BattleStatus.FINISHED) {
				throw new IllegalStateException("Battle is already finished");
			}
			Team forfeitingTeam = battle.teamOf(request.playerId());
			battle.setWinnerId(forfeitingTeam == Team.RED
					? battle.getBluePlayerId()
					: battle.getRedPlayerId());
			battle.setStatus(BattleStatus.FINISHED);
			persist(battle);
		}
		producer.publishForfeit(battle, request.playerId());
		producer.publishBattleEnded(battle);
		return battle;
	}

	@Scheduled(fixedDelay = 5000)
	public void checkExpiredTimers() {
		Instant now = Instant.now();
		battles.values().forEach(battle -> {
			if (battle.getStatus() != BattleStatus.IN_PROGRESS)
				return;
			if (battle.getTurnDeadline() == null || now.isBefore(battle.getTurnDeadline()))
				return;

			synchronized (battle) {
				if (battle.getStatus() != BattleStatus.IN_PROGRESS)
					return;
				if (now.isBefore(battle.getTurnDeadline()))
					return;

				boolean redActed = battle.getRedAction() != null;
				boolean blueActed = battle.getBlueAction() != null;

				if (!redActed && !blueActed)
					return;

				if (!redActed) {
					battle.setWinnerId(battle.getBluePlayerId());
					battle.setStatus(BattleStatus.FINISHED);
				} else {
					battle.setWinnerId(battle.getRedPlayerId());
					battle.setStatus(BattleStatus.FINISHED);
				}
				persist(battle);
				producer.publishBattleEnded(battle);
			}
		});
	}

	private void startBattle(Battle battle, boolean randomFirstPokemon) {
		battle.setStatus(BattleStatus.IN_PROGRESS);
		battle.setTurnNumber(1);
		battle.setTurnDeadline(Instant.now().plusSeconds(TURN_SECONDS));

		if (randomFirstPokemon) {
			battle.setRedActivePokemon(randomFrom(battle.getRedTeam()));
			battle.setBlueActivePokemon(randomFrom(battle.getBlueTeam()));
		}
	}

	private void resolveTurn(Battle battle) {
		TurnResult result = resolver.resolve(battle);
		battle.getTurnHistory().add(result);
		persist(battle);
		producer.publishTurnResult(battle, result);

		if (battle.getStatus() == BattleStatus.FINISHED) {
			producer.publishBattleEnded(battle);
		} else {
			battle.setTurnNumber(battle.getTurnNumber() + 1);
			battle.setRedAction(null);
			battle.setBlueAction(null);
			battle.setTurnDeadline(Instant.now().plusSeconds(TURN_SECONDS));
		}
	}

	private void persist(Battle battle) {
		try {
			String json = objectMapper.writeValueAsString(battle);
			BattleEntity entity = battleRepository.findById(battle.getBattleId())
					.orElse(new BattleEntity(
							battle.getBattleId(),
							battle.getRedPlayerId(),
							battle.getBluePlayerId(),
							battle.getMode(),
							battle.getStatus(),
							battle.getWinnerId(),
							battle.getTurnNumber(),
							json));
			entity.setStatus(battle.getStatus());
			entity.setWinnerId(battle.getWinnerId());
			entity.setTurnNumber(battle.getTurnNumber());
			entity.setBattleData(json);
			entity.setUpdatedAt(Instant.now());
			battleRepository.save(entity);
		} catch (Exception e) {
			// log — DB failure must not block the battle
		}
	}

	private Battle deserialize(BattleEntity entity) {
		try {
			return objectMapper.readValue(entity.getBattleData(), Battle.class);
		} catch (Exception e) {
			throw new IllegalStateException("Failed to deserialize battle " + entity.getBattleId(), e);
		}
	}

	private List<BattlePokemon> fetchTeam(List<Integer> ids) {
		return ids.stream()
				.map(pokemonClient::getPokemon)
				.toList();
	}

	private List<BattlePokemon> randomPokemonPool(int count) {
		List<Integer> ids = new ArrayList<>(IntStream.rangeClosed(1, MAX_POKEMON_ID).boxed().toList());
		Collections.shuffle(ids, random);
		return ids.stream()
				.limit(count)
				.map(pokemonClient::getPokemon)
				.toList();
	}

	private BattlePokemon randomFrom(List<BattlePokemon> team) {
		return team.get(random.nextInt(team.size()));
	}
}
