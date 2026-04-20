package com.example.combat.controller;

import com.example.combat.model.Battle;
import com.example.combat.model.CreateBattleRequest;
import com.example.combat.model.DraftPickRequest;
import com.example.combat.model.ForfeitRequest;
import com.example.combat.model.PlayerActionRequest;
import com.example.combat.model.TurnResult;
import com.example.combat.service.BattleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/combat")
public class BattleController {

	private final BattleService battleService;

	public BattleController(BattleService battleService) {
		this.battleService = battleService;
	}

	@PostMapping("/battle")
	public Battle createBattle(@RequestBody CreateBattleRequest request) {
		return battleService.createBattle(request);
	}

	@GetMapping("/battle/{battleId}")
	public Battle getBattle(@PathVariable String battleId, @AuthenticationPrincipal Jwt jwt) {
		Battle battle = battleService.getBattle(battleId);
		String callerId = jwt.getSubject();
		if (!battle.getRedPlayerId().equals(callerId) && !battle.getBluePlayerId().equals(callerId)) {
			throw new AccessDeniedException("You are not a participant of this battle");
		}
		return battle;
	}

	@GetMapping("/battles/mine")
	public List<Battle> getMyBattles(@AuthenticationPrincipal Jwt jwt) {
		return battleService.getBattlesByPlayer(jwt.getSubject());
	}

	@GetMapping("/battle/{battleId}/turns")
	public List<TurnResult> getTurns(@PathVariable String battleId, @AuthenticationPrincipal Jwt jwt) {
		Battle battle = battleService.getBattle(battleId);
		String callerId = jwt.getSubject();
		if (!battle.getRedPlayerId().equals(callerId) && !battle.getBluePlayerId().equals(callerId)) {
			throw new AccessDeniedException("You are not a participant of this battle");
		}
		return battleService.getTurns(battleId);
	}

	@GetMapping("/battle/{battleId}/turns/{turnNumber}")
	public TurnResult getTurn(@PathVariable String battleId, @PathVariable int turnNumber,
			@AuthenticationPrincipal Jwt jwt) {
		Battle battle = battleService.getBattle(battleId);
		String callerId = jwt.getSubject();
		if (!battle.getRedPlayerId().equals(callerId) && !battle.getBluePlayerId().equals(callerId)) {
			throw new AccessDeniedException("You are not a participant of this battle");
		}
		return battleService.getTurn(battleId, turnNumber);
	}

	@PostMapping("/battle/{battleId}/draft")
	public Battle draftPick(@PathVariable String battleId, @RequestBody DraftPickRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		requireSelf(jwt, request.playerId());
		return battleService.draftPick(battleId, request);
	}

	@PostMapping("/battle/{battleId}/action")
	public Battle submitAction(@PathVariable String battleId, @RequestBody PlayerActionRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		requireSelf(jwt, request.playerId());
		return battleService.submitAction(battleId, request);
	}

	@PostMapping("/battle/{battleId}/forfeit")
	public Battle forfeit(@PathVariable String battleId, @RequestBody ForfeitRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		requireSelf(jwt, request.playerId());
		return battleService.forfeit(battleId, request);
	}

	private void requireSelf(Jwt jwt, String playerId) {
		if (!jwt.getSubject().equals(playerId)) {
			throw new AccessDeniedException("You can only act for yourself");
		}
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<Map<String, String>> handleForbidden(AccessDeniedException ex) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
		return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
	}

	@ExceptionHandler(IllegalStateException.class)
	public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException ex) {
		return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
	}
}
