package com.example.combat.repository;

import com.example.combat.entity.TeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeamRepository extends JpaRepository<TeamEntity, String> {
    List<TeamEntity> findByPlayerId(String playerId);
}