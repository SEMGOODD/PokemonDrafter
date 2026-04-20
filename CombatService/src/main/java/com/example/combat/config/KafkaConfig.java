package com.example.combat.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

	@Bean
	public NewTopic battleTopic() {
		return TopicBuilder.name("battle").partitions(3).replicas(1).build();
	}

	@Bean
	public NewTopic chatTopic() {
		return TopicBuilder.name("chat").partitions(3).replicas(1).build();
	}

	@Bean
	public NewTopic logsServiceTopic() {
		return TopicBuilder.name("logs-service").partitions(3).replicas(1).build();
	}
}
