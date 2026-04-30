package com.example.logs.kafka;

import com.example.logs.service.LogIngestService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class LogEventConsumer {

	private final LogIngestService ingestService;

	public LogEventConsumer(LogIngestService ingestService) {
		this.ingestService = ingestService;
	}

	@KafkaListener(topics = "${logs.topics.primary}", groupId = "${spring.kafka.consumer.group-id}")
	public void onMessage(String payload) {
		ingestService.ingest(payload);
	}
}
