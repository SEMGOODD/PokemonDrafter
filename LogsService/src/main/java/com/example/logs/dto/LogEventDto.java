package com.example.logs.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Représentation typée d'un événement Kafka du topic logs-service.
 *
 * Les champs sont tous optionnels : le consumer applique des défauts pour
 * accepter le format historique (ex. CombatService publiant {eventType, battleId})
 * en plus du format complet de l'appender Logback Kafka.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class LogEventDto {

	private String service;
	private String level;
	private String timestamp;
	private String message;
	private JsonNode context;
}
