package com.example.combat.service;

import com.example.combat.client.PokemonServiceClient;
import com.example.combat.entity.TeamEntity;
import com.example.combat.entity.TeamPokemonEntity;
import com.example.combat.model.*;
import com.example.combat.repository.TeamPokemonRepository;
import com.example.combat.repository.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class TeamService {

    private static final int MAX_TEAM_SIZE = 6;

    private final TeamRepository teamRepository;
    private final TeamPokemonRepository teamPokemonRepository;
    private final PokemonServiceClient pokemonClient;

    public TeamService(TeamRepository teamRepository,
                       TeamPokemonRepository teamPokemonRepository,
                       PokemonServiceClient pokemonClient) {
        this.teamRepository = teamRepository;
        this.teamPokemonRepository = teamPokemonRepository;
        this.pokemonClient = pokemonClient;
    }

    public List<TeamResponse> getMyTeams(String playerId) {
        return teamRepository.findByPlayerId(playerId)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public TeamResponse createTeam(String playerId, TeamRequest request) {
        TeamEntity team = new TeamEntity(UUID.randomUUID().toString(), playerId, request.name());
        return toResponse(teamRepository.save(team));
    }

    public TeamResponse renameTeam(String teamId, String playerId, TeamRequest request) {
        TeamEntity team = getOwnedTeam(teamId, playerId);
        team.setName(request.name());
        team.setUpdatedAt(Instant.now());
        return toResponse(teamRepository.save(team));
    }

    @Transactional
    public void deleteTeam(String teamId, String playerId) {
        TeamEntity team = getOwnedTeam(teamId, playerId);
        teamRepository.delete(team);
    }

    @Transactional
    public TeamResponse addPokemon(String teamId, String playerId, TeamPokemonRequest request) {
        TeamEntity team = getOwnedTeam(teamId, playerId);

        if (team.getPokemons().size() >= MAX_TEAM_SIZE) {
            throw new IllegalStateException("Team already has 6 Pokémon");
        }
        boolean slotTaken = team.getPokemons().stream()
            .anyMatch(p -> p.getSlot() == request.slot());
        if (slotTaken) {
            throw new IllegalArgumentException("Slot " + request.slot() + " is already taken");
        }

        // Fetch name from PokemonService
        BattlePokemon data = pokemonClient.getPokemon(request.pokemonId());

        TeamPokemonEntity entry = new TeamPokemonEntity(
            UUID.randomUUID().toString(),
            team,
            request.pokemonId(),
            data.getName(),
            request.slot()
        );
        team.getPokemons().add(entry);
        team.setUpdatedAt(Instant.now());
        return toResponse(teamRepository.save(team));
    }

    @Transactional
    public TeamResponse removePokemon(String teamId, String playerId, int slot) {
        TeamEntity team = getOwnedTeam(teamId, playerId);
        teamPokemonRepository.deleteByTeamTeamIdAndSlot(teamId, slot);
        team.setUpdatedAt(Instant.now());
        teamRepository.save(team);
        // Reload to get fresh state
        return toResponse(teamRepository.findById(teamId).orElseThrow());
    }

    private TeamEntity getOwnedTeam(String teamId, String playerId) {
        TeamEntity team = teamRepository.findById(teamId)
            .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));
        if (!team.getPlayerId().equals(playerId)) {
            throw new org.springframework.security.access.AccessDeniedException("This team does not belong to you");
        }
        return team;
    }

    private TeamResponse toResponse(TeamEntity team) {
        List<TeamPokemonResponse> pokemons = team.getPokemons().stream()
            .map(p -> new TeamPokemonResponse(p.getSlot(), p.getPokemonId(), p.getPokemonName()))
            .toList();
        return new TeamResponse(team.getTeamId(), team.getName(), team.getPlayerId(), pokemons);
    }
}