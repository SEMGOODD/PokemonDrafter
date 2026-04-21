package com.example.pokemon.cache;

import com.example.pokemon.config.CacheConstants;
import com.example.pokemon.model.Pokemon;
import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class PokemonCacheRepository {

	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;

	public PokemonCacheRepository(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
		this.redisTemplate = redisTemplate;
		this.objectMapper = objectMapper;
	}

	public Optional<Pokemon> findById(int id) {
		String json = redisTemplate.opsForValue().get(keyForId(id));
		if (json == null) {
			return Optional.empty();
		}
		try {
			return Optional.of(objectMapper.readValue(json, Pokemon.class));
		} catch (JacksonException e) {
			throw new IllegalStateException("Corrupted Pokemon JSON in cache for id " + id, e);
		}
	}

	public void save(Pokemon pokemon) {
		try {
			String json = objectMapper.writeValueAsString(pokemon);
			redisTemplate.opsForValue().set(keyForId(pokemon.id()), json, CacheConstants.TTL_POKEMON);
			redisTemplate.opsForValue().set(keyForName(pokemon.name()), String.valueOf(pokemon.id()),
					CacheConstants.TTL_POKEMON);
		} catch (JacksonException e) {
			throw new IllegalStateException("Failed to serialize Pokemon id " + pokemon.id(), e);
		}
	}

	public Optional<Integer> findIdByName(String name) {
		String value = redisTemplate.opsForValue().get(keyForName(name));
		return value == null ? Optional.empty() : Optional.of(Integer.parseInt(value));
	}

	private String keyForId(int id) {
		return CacheConstants.KEY_PREFIX_POKEMON + id;
	}

	private String keyForName(String name) {
		return CacheConstants.KEY_PREFIX_POKEMON_NAME + name.toLowerCase();
	}
}
