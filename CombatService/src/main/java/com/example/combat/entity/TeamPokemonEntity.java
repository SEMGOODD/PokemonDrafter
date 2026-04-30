package com.example.combat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "team_pokemons")
@Getter
@Setter
@NoArgsConstructor
public class TeamPokemonEntity {

    @Id
    @Column(name = "id")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private TeamEntity team;

    @Column(name = "pokemon_id", nullable = false)
    private int pokemonId;

    @Column(name = "pokemon_name", nullable = false)
    private String pokemonName;

    @Column(nullable = false)
    private int slot;

    public TeamPokemonEntity(String id, TeamEntity team, int pokemonId, String pokemonName, int slot) {
        this.id = id;
        this.team = team;
        this.pokemonId = pokemonId;
        this.pokemonName = pokemonName;
        this.slot = slot;
    }
}