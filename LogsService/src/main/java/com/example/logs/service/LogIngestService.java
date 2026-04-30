package com.example.logs.service;

import com.example.logs.domain.LogEntry;
import com.example.logs.dto.LogEventDto;
import com.example.logs.repository.LogEntryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeParseException;

@Service
public class LogIngestService {

	private static final Logger LOGGER = LoggerFactory.getLogger(LogIngestService.class);

	private static final String DEFAULT_SERVICE = "unknown";
	private static final String DEFAULT_LEVEL = "INFO";
	private static final String FIELD_EVENT_TYPE = "eventType";

	private final LogEntryRepository repository;
	private final ObjectMapper objectMapper;

	public LogIngestService(LogEntryRepository repository, ObjectMapper objectMapper) {
		this.repository = repository;
		this.objectMapper = objectMapper;
	}

	public void ingest(String rawPayload) {
		try {
			JsonNode root = objectMapper.readTree(rawPayload);
			LogEventDto event = objectMapper.treeToValue(root, LogEventDto.class);
			LogEntry entry = toEntry(event, root);
			repository.save(entry);
		} catch (Exception e) {
			LOGGER.warn("Could not ingest log payload: {}", e.getMessage());
		}
	}

	private LogEntry toEntry(LogEventDto event, JsonNode root) {
		String service = firstNonBlank(event.getService(), DEFAULT_SERVICE);
		String level = firstNonBlank(event.getLevel(), DEFAULT_LEVEL).toUpperCase();
		Instant timestamp = parseTimestamp(event.getTimestamp());
		String message = firstNonBlank(event.getMessage(), extractEventType(root));
		return LogEntry.builder()
				.service(service)
				.level(level)
				.timestamp(timestamp)
				.message(message)
				.context(root.toString())
				.build();
	}

	private String extractEventType(JsonNode root) {
		JsonNode eventType = root.get(FIELD_EVENT_TYPE);
		if (eventType != null && !eventType.isNull()) {
			return eventType.asText();
		}
		return root.toString();
	}

	private Instant parseTimestamp(String value) {
		if (value == null || value.isBlank()) {
			return Instant.now();
		}
		try {
			return Instant.parse(value);
		} catch (DateTimeParseException e) {
			return Instant.now();
		}
	}

	private String firstNonBlank(String value, String fallback) {
		return value != null && !value.isBlank() ? value : fallback;
	}
}
