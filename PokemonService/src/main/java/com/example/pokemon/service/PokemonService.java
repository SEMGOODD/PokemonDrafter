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
	private final PokemonNameIndexService nameIndexService;

	public PokemonService(
			PokemonCacheRepository cache,
			PokeApiClient pokeApiClient,
			PokeApiMapper mapper,
			SpeciesService speciesService,
			PokemonNameIndexService nameIndexService
	) {
		this.cache = cache;
		this.pokeApiClient = pokeApiClient;
		this.mapper = mapper;
		this.speciesService = speciesService;
		this.nameIndexService = nameIndexService;
	}

	public Pokemon getById(int id) {
		Pokemon canonical = cache.findById(id).orElseGet(() -> fetchAndCache(String.valueOf(id)));
		return withFrenchNameIfAvailable(canonical);
	}

	public Pokemon getByName(String name) {
		Pokemon canonical = cache.findIdByName(name)
				.flatMap(cache::findById)
				.orElseGet(() -> fetchAndCache(name.toLowerCase()));
		return withFrenchNameIfAvailable(canonical);
	}

	private Pokemon fetchAndCache(String idOrName) {
		JsonNode pokemonNode = pokeApiClient.fetchPokemon(idOrName);
		int speciesId = mapper.extractSpeciesIdFromPokemonNode(pokemonNode);
		Species species = speciesService.getById(speciesId);
		Pokemon pokemon = mapper.toPokemon(pokemonNode, species);
		cache.save(pokemon);
		return pokemon;
	}

	private Pokemon withFrenchNameIfAvailable(Pokemon pokemon) {
		String nameFr = nameIndexService.getFrenchName(pokemon.id());
		if (nameFr == null || nameFr.isBlank()) {
			return pokemon;
		}
		return new Pokemon(
				pokemon.id(),
				nameFr,
				pokemon.types(),
				pokemon.height(),
				pokemon.weight(),
				pokemon.stats(),
				pokemon.description(),
				pokemon.habitat(),
				pokemon.sprite()
		);
	}
}
