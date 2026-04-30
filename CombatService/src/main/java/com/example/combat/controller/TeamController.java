package com.example.combat.controller;

import com.example.combat.model.TeamPokemonRequest;
import com.example.combat.model.TeamRequest;
import com.example.combat.model.TeamResponse;
import com.example.combat.service.TeamService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping
    public List<TeamResponse> getMyTeams(@AuthenticationPrincipal Jwt jwt) {
        return teamService.getMyTeams(playerId(jwt));
    }

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(@AuthenticationPrincipal Jwt jwt,
                                                    @RequestBody TeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(teamService.createTeam(playerId(jwt), request));
    }

    @PutMapping("/{teamId}")
    public TeamResponse renameTeam(@PathVariable String teamId,
                                   @AuthenticationPrincipal Jwt jwt,
                                   @RequestBody TeamRequest request) {
        return teamService.renameTeam(teamId, playerId(jwt), request);
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(@PathVariable String teamId,
                                           @AuthenticationPrincipal Jwt jwt) {
        teamService.deleteTeam(teamId, playerId(jwt));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{teamId}/pokemon")
    public TeamResponse addPokemon(@PathVariable String teamId,
                                   @AuthenticationPrincipal Jwt jwt,
                                   @RequestBody TeamPokemonRequest request) {
        return teamService.addPokemon(teamId, playerId(jwt), request);
    }

    @DeleteMapping("/{teamId}/pokemon/{slot}")
    public TeamResponse removePokemon(@PathVariable String teamId,
                                      @PathVariable int slot,
                                      @AuthenticationPrincipal Jwt jwt) {
        return teamService.removePokemon(teamId, playerId(jwt), slot);
    }

    private String playerId(Jwt jwt) {
        return jwt.getClaimAsString("preferred_username");
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