package com.example.combat.service;

import com.example.combat.entity.PlayerEntity;
import com.example.combat.model.PlayerResponse;
import com.example.combat.repository.PlayerRepository;
import org.springframework.stereotype.Service;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public PlayerResponse getOrCreate(String playerId, String color) {
        PlayerEntity player = playerRepository.findById(playerId)
            .orElseGet(() -> playerRepository.save(new PlayerEntity(playerId, color)));
        return toResponse(player);
    }

    public PlayerResponse getMe(String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
            .orElseThrow(() -> new IllegalArgumentException("Player not found: " + playerId));
        return toResponse(player);
    }

    public PlayerResponse changeColor(String playerId, String newColor) {
        if (!newColor.equals("red") && !newColor.equals("blue")) {
            throw new IllegalArgumentException("Color must be 'red' or 'blue'");
        }
        PlayerEntity player = playerRepository.findById(playerId)
            .orElseThrow(() -> new IllegalArgumentException("Player not found: " + playerId));
        player.setColor(newColor);
        player.setUpdatedAt(java.time.Instant.now());
        return toResponse(playerRepository.save(player));
    }

    public void updateScores(String winnerId, String loserId) {
        applyScore(winnerId, +10);
        applyScore(loserId, -10);
    }

    private void applyScore(String playerId, int delta) {
        playerRepository.findById(playerId).ifPresent(player -> {
            int newScore = Math.max(0, player.getScore() + delta);
            player.setScore(newScore);
            player.setUpdatedAt(java.time.Instant.now());
            playerRepository.save(player);
        });
    }

    private PlayerResponse toResponse(PlayerEntity e) {
        return new PlayerResponse(e.getPlayerId(), e.getColor(), e.getScore());
    }
}