package com.example.pokemon.cache;

import com.example.pokemon.config.CacheConstants;
import com.example.pokemon.model.Species;
import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class SpeciesCacheRepository {

	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;

	public SpeciesCacheRepository(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
		this.redisTemplate = redisTemplate;
		this.objectMapper = objectMapper;
	}

	public Optional<Species> findById(int id) {
		String json = redisTemplate.opsForValue().get(keyForId(id));
		if (json == null) {
			return Optional.empty();
		}
		try {
			return Optional.of(objectMapper.readValue(json, Species.class));
		} catch (JacksonException e) {
			throw new IllegalStateException("Corrupted Species JSON in cache for id " + id, e);
		}
	}

	public void save(Species species) {
		try {
			String json = objectMapper.writeValueAsString(species);
			redisTemplate.opsForValue().set(keyForId(species.id()), json, CacheConstants.TTL_SPECIES);
		} catch (JacksonException e) {
			throw new IllegalStateException("Failed to serialize Species id " + species.id(), e);
		}
	}

	private String keyForId(int id) {
		return CacheConstants.KEY_PREFIX_SPECIES + id;
	}
}
