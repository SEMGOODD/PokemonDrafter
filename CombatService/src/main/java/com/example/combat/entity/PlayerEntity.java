package com.example.combat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "players")
@Getter
@Setter
@NoArgsConstructor
public class PlayerEntity {

    @Id
    @Column(name = "player_id")
    private String playerId;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private int score = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public PlayerEntity(String playerId, String color) {
        this.playerId = playerId;
        this.color = color;
        this.score = 0;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }
}