package com.example.pokemon.service;

import com.example.pokemon.cache.SpeciesCacheRepository;
import com.example.pokemon.client.PokeApiClient;
import com.example.pokemon.mapper.PokeApiMapper;
import com.example.pokemon.model.Species;
import tools.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

@Service
public class SpeciesService {

	private final SpeciesCacheRepository cache;
	private final PokeApiClient pokeApiClient;
	private final PokeApiMapper mapper;

	public SpeciesService(SpeciesCacheRepository cache, PokeApiClient pokeApiClient, PokeApiMapper mapper) {
		this.cache = cache;
		this.pokeApiClient = pokeApiClient;
		this.mapper = mapper;
	}

	public Species getById(int speciesId) {
		return cache.findById(speciesId).orElseGet(() -> fetchAndCache(speciesId));
	}

	private Species fetchAndCache(int speciesId) {
		JsonNode node = pokeApiClient.fetchPokemonSpecies(speciesId);
		Species species = mapper.toSpecies(speciesId, node);
		cache.save(species);
		return species;
	}
}
