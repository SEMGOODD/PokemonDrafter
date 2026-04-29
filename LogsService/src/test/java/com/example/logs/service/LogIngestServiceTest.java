package com.example.logs.service;

import com.example.logs.domain.LogEntry;
import com.example.logs.repository.LogEntryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class LogIngestServiceTest {

	private LogEntryRepository repository;
	private LogIngestService service;

	@BeforeEach
	void setUp() {
		repository = mock(LogEntryRepository.class);
		ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
		service = new LogIngestService(repository, mapper);
	}

	@Test
	void ingestsRichLogbackPayload() {
		String payload = """
				{
				  "service": "combat-service",
				  "level": "ERROR",
				  "timestamp": "2026-04-29T10:00:00Z",
				  "message": "boom",
				  "context": {"userId": "u1"}
				}
				""";

		service.ingest(payload);

		ArgumentCaptor<LogEntry> captor = ArgumentCaptor.forClass(LogEntry.class);
		verify(repository).save(captor.capture());
		LogEntry saved = captor.getValue();
		assertThat(saved.getService()).isEqualTo("combat-service");
		assertThat(saved.getLevel()).isEqualTo("ERROR");
		assertThat(saved.getMessage()).isEqualTo("boom");
		assertThat(saved.getContext()).contains("userId");
	}

	@Test
	void ingestsLegacyBattleEventWithDefaults() {
		String payload = "{\"eventType\":\"BATTLE_STARTED\",\"battleId\":\"b1\"}";

		service.ingest(payload);

		ArgumentCaptor<LogEntry> captor = ArgumentCaptor.forClass(LogEntry.class);
		verify(repository).save(captor.capture());
		LogEntry saved = captor.getValue();
		assertThat(saved.getService()).isEqualTo("unknown");
		assertThat(saved.getLevel()).isEqualTo("INFO");
		assertThat(saved.getMessage()).isEqualTo("BATTLE_STARTED");
		assertThat(saved.getContext()).contains("b1");
	}

	@Test
	void invalidJsonIsSwallowed() {
		service.ingest("not-json");
		verify(repository, org.mockito.Mockito.never()).save(org.mockito.ArgumentMatchers.any());
	}
}
