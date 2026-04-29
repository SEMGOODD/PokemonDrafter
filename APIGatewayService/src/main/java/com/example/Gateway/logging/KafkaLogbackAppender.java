package com.example.Gateway.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.AppenderBase;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Voir CombatService.KafkaLogbackAppender pour la doc complète.
 * Ce fichier est volontairement dupliqué : chaque service est packagé
 * indépendamment et un module commun ajouterait plus de complexité que de
 * gain pour 100 lignes.
 */
public class KafkaLogbackAppender extends AppenderBase<ILoggingEvent> {

	private static final int LINGER_MS = 50;
	private static final int RETRIES = 0;
	private static final String CLIENT_ID_PREFIX = "logback-";

	private String bootstrapServers;
	private String topic;
	private String serviceName;
	private Producer<String, String> producer;
	private final ObjectMapper objectMapper = new ObjectMapper();

	public void setBootstrapServers(String bootstrapServers) {
		this.bootstrapServers = bootstrapServers;
	}

	public void setTopic(String topic) {
		this.topic = topic;
	}

	public void setServiceName(String serviceName) {
		this.serviceName = serviceName;
	}

	@Override
	public void start() {
		if (bootstrapServers == null || bootstrapServers.isBlank()
				|| topic == null || topic.isBlank()) {
			addWarn("KafkaLogbackAppender disabled: bootstrapServers or topic missing");
			return;
		}
		Properties props = new Properties();
		props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
		props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
		props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
		props.put(ProducerConfig.CLIENT_ID_CONFIG, CLIENT_ID_PREFIX + safeName(serviceName));
		props.put(ProducerConfig.LINGER_MS_CONFIG, LINGER_MS);
		props.put(ProducerConfig.RETRIES_CONFIG, RETRIES);
		this.producer = new KafkaProducer<>(props);
		super.start();
	}

	@Override
	public void stop() {
		if (producer != null) {
			producer.close();
		}
		super.stop();
	}

	@Override
	protected void append(ILoggingEvent event) {
		if (producer == null) {
			return;
		}
		try {
			String payload = objectMapper.writeValueAsString(toMap(event));
			producer.send(new ProducerRecord<>(topic, payload), (md, ex) -> {
				if (ex != null) {
					addWarn("Failed to publish log to Kafka: " + ex.getMessage());
				}
			});
		} catch (JsonProcessingException e) {
			addWarn("Failed to serialize log event: " + e.getMessage());
		}
	}

	private Map<String, Object> toMap(ILoggingEvent event) {
		Map<String, Object> root = new LinkedHashMap<>();
		root.put("service", safeName(serviceName));
		root.put("level", event.getLevel().toString());
		root.put("timestamp", Instant.ofEpochMilli(event.getTimeStamp()).toString());
		root.put("message", event.getFormattedMessage());

		Map<String, Object> ctx = new HashMap<>();
		ctx.put("logger", event.getLoggerName());
		ctx.put("thread", event.getThreadName());
		IThrowableProxy throwable = event.getThrowableProxy();
		if (throwable != null) {
			ctx.put("throwable", ThrowableProxyUtil.asString(throwable));
		}
		root.put("context", ctx);
		return root;
	}

	private String safeName(String value) {
		return value != null && !value.isBlank() ? value : "unknown";
	}
}
