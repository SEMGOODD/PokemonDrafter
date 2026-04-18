package com.example.pokemon.cache;

import com.example.pokemon.config.CacheConstants;
import com.example.pokemon.model.TypeEffectiveness;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class TypeCacheRepository {

	private static final TypeReference<List<Integer>> ID_LIST_TYPE = new TypeReference<>() {
	};

	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;

	public TypeCacheRepository(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
		this.redisTemplate = redisTemplate;
		this.objectMapper = objectMapper;
	}

	public Optional<List<Integer>> findPokemonIdsForType(String typeName) {
		String json = redisTemplate.opsForValue().get(keyForType(typeName));
		if (json == null) {
			return Optional.empty();
		}
		try {
			return Optional.of(objectMapper.readValue(json, ID_LIST_TYPE));
		} catch (JacksonException e) {
			throw new IllegalStateException("Corrupted id list JSON in cache for type " + typeName, e);
		}
	}

	public void savePokemonIdsForType(String typeName, List<Integer> ids) {
		try {
			String json = objectMapper.writeValueAsString(ids);
			redisTemplate.opsForValue().set(keyForType(typeName), json, CacheConstants.TTL_TYPE_LIST);
		} catch (JacksonException e) {
			throw new IllegalStateException("Failed to serialize id list for type " + typeName, e);
		}
	}

	public Optional<TypeEffectiveness> findEffectiveness() {
		String json = redisTemplate.opsForValue().get(CacheConstants.KEY_TYPE_EFFECTIVENESS);
		if (json == null) {
			return Optional.empty();
		}
		try {
			return Optional.of(objectMapper.readValue(json, TypeEffectiveness.class));
		} catch (JacksonException e) {
			throw new IllegalStateException("Corrupted type effectiveness JSON in cache", e);
		}
	}

	public void saveEffectiveness(TypeEffectiveness effectiveness) {
		try {
			String json = objectMapper.writeValueAsString(effectiveness);
			redisTemplate.opsForValue().set(CacheConstants.KEY_TYPE_EFFECTIVENESS, json, CacheConstants.TTL_EFFECTIVENESS);
		} catch (JacksonException e) {
			throw new IllegalStateException("Failed to serialize type effectiveness matrix", e);
		}
	}

	private String keyForType(String typeName) {
		return CacheConstants.KEY_PREFIX_TYPE_POKEMON + typeName.toLowerCase() + CacheConstants.KEY_SUFFIX_TYPE_POKEMON;
	}
}
