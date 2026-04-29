package com.example.logs.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Persistance des logs centralisés. Les index sur (service, level, timestamp)
 * couvrent les filtres MVP de la console admin et les futures combinaisons.
 */
@Entity
@Table(name = "log_entries", indexes = {
		@Index(name = "idx_log_service", columnList = "service"),
		@Index(name = "idx_log_level", columnList = "level"),
		@Index(name = "idx_log_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogEntry {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 64)
	private String service;

	@Column(nullable = false, length = 16)
	private String level;

	@Column(nullable = false)
	private Instant timestamp;

	@Column(columnDefinition = "TEXT")
	private String message;

	/**
	 * Stocke la payload Kafka brute en JSON afin que les futurs champs
	 * (battleId, userId, eventType, etc.) restent consultables sans migration BD.
	 */
	@Column(columnDefinition = "TEXT")
	private String context;
}
