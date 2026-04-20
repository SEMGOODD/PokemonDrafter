package com.example.pokemon.cache;

import com.example.pokemon.config.CacheConstants;
import com.example.pokemon.model.NameIndexEntry;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class NameIndexCacheRepository {

	private static final TypeReference<List<NameIndexEntry>> INDEX_TYPE = new TypeReference<>() {
	};

	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;

	public NameIndexCacheRepository(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
		this.redisTemplate = redisTemplate;
		this.objectMapper = objectMapper;
	}

	public Optional<List<NameIndexEntry>> find() {
		String json = redisTemplate.opsForValue().get(CacheConstants.KEY_POKEMON_NAME_INDEX);
		if (json == null) {
			return Optional.empty();
		}
		try {
			return Optional.of(objectMapper.readValue(json, INDEX_TYPE));
		} catch (JacksonException e) {
			throw new IllegalStateException("Corrupted name-index JSON in cache", e);
		}
	}

	public void save(List<NameIndexEntry> index) {
		try {
			String json = objectMapper.writeValueAsString(index);
			redisTemplate.opsForValue().set(
					CacheConstants.KEY_POKEMON_NAME_INDEX,
					json,
					CacheConstants.TTL_NAME_INDEX
			);
		} catch (JacksonException e) {
			throw new IllegalStateException("Failed to serialize name-index", e);
		}
	}
}
