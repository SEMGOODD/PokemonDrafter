package com.example.pokemon.service;

import com.example.pokemon.cache.TypeCacheRepository;
import com.example.pokemon.client.PokeApiClient;
import com.example.pokemon.mapper.PokeApiMapper;
import tools.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TypePokemonListService {

	private final TypeCacheRepository cache;
	private final PokeApiClient pokeApiClient;
	private final PokeApiMapper mapper;

	public TypePokemonListService(TypeCacheRepository cache, PokeApiClient pokeApiClient, PokeApiMapper mapper) {
		this.cache = cache;
		this.pokeApiClient = pokeApiClient;
		this.mapper = mapper;
	}

	public List<Integer> getPokemonIdsForType(String typeName) {
		return cache.findPokemonIdsForType(typeName).orElseGet(() -> fetchAndCache(typeName));
	}

	private List<Integer> fetchAndCache(String typeName) {
		JsonNode typeNode = pokeApiClient.fetchType(typeName.toLowerCase());
		List<Integer> ids = mapper.extractPokemonIdsFromTypeNode(typeNode);
		cache.savePokemonIdsForType(typeName, ids);
		return ids;
	}
}
