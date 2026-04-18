package com.example.pokemon.service;

import com.example.pokemon.cache.PokemonCacheRepository;
import com.example.pokemon.client.PokeApiClient;
import com.example.pokemon.mapper.PokeApiMapper;
import com.example.pokemon.model.Pokemon;
import com.example.pokemon.model.Species;
import tools.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

@Service
public class PokemonService {

	private final PokemonCacheRepository cache;
	private final PokeApiClient pokeApiClient;
	private final PokeApiMapper mapper;
	private final SpeciesService speciesService;

	public PokemonService(
			PokemonCacheRepository cache,
			PokeApiClient pokeApiClient,
			PokeApiMapper mapper,
			SpeciesService speciesService
	) {
		this.cache = cache;
		this.pokeApiClient = pokeApiClient;
		this.mapper = mapper;
		this.speciesService = speciesService;
	}

	public Pokemon getById(int id) {
		return cache.findById(id).orElseGet(() -> fetchAndCache(String.valueOf(id)));
	}

	public Pokemon getByName(String name) {
		return cache.findIdByName(name)
				.flatMap(cache::findById)
				.orElseGet(() -> fetchAndCache(name.toLowerCase()));
	}

	private Pokemon fetchAndCache(String idOrName) {
		JsonNode pokemonNode = pokeApiClient.fetchPokemon(idOrName);
		int speciesId = mapper.extractSpeciesIdFromPokemonNode(pokemonNode);
		Species species = speciesService.getById(speciesId);
		Pokemon pokemon = mapper.toPokemon(pokemonNode, species);
		cache.save(pokemon);
		return pokemon;
	}
}
