package com.example.combat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "teams")
@Getter
@Setter
@NoArgsConstructor
public class TeamEntity {

    @Id
    @Column(name = "team_id")
    private String teamId;

    @Column(name = "player_id", nullable = false)
    private String playerId;

    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("slot ASC")
    private List<TeamPokemonEntity> pokemons = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public TeamEntity(String teamId, String playerId, String name) {
        this.teamId = teamId;
        this.playerId = playerId;
        this.name = name;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }
}