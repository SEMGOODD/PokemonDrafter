package com.example.combat.repository;

import com.example.combat.entity.BattleEntity;
import com.example.combat.model.BattleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BattleRepository extends JpaRepository<BattleEntity, String> {

	@Query("SELECT b FROM BattleEntity b WHERE b.status = :status AND (b.redPlayerId = :playerId OR b.bluePlayerId = :playerId)")
	List<BattleEntity> findFinishedByPlayer(@Param("status") BattleStatus status, @Param("playerId") String playerId);
}
