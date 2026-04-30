package com.example.combat.repository;

import com.example.combat.entity.TeamPokemonEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamPokemonRepository extends JpaRepository<TeamPokemonEntity, String> {
    void deleteByTeamTeamIdAndSlot(String teamId, int slot);
}