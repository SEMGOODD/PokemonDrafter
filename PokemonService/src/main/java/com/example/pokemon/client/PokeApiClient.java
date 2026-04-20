package com.example.pokemon.client;

import tools.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class PokeApiClient {

	private static final String PATH_POKEMON = "/pokemon/{idOrName}";
	private static final String PATH_POKEMON_SPECIES = "/pokemon-species/{id}";
	private static final String PATH_POKEMON_SPECIES_LIST = "/pokemon-species";
	private static final String PATH_TYPE = "/type/{name}";

	private static final String QUERY_PARAM_LIMIT = "limit";
	private static final String QUERY_PARAM_OFFSET = "offset";

	private final RestClient restClient;

	public PokeApiClient(RestClient pokeApiRestClient) {
		this.restClient = pokeApiRestClient;
	}

	public JsonNode fetchPokemon(String idOrName) {
		return restClient.get()
				.uri(PATH_POKEMON, idOrName)
				.retrieve()
				.body(JsonNode.class);
	}

	public JsonNode fetchPokemonSpecies(int speciesId) {
		return restClient.get()
				.uri(PATH_POKEMON_SPECIES, speciesId)
				.retrieve()
				.body(JsonNode.class);
	}

	public JsonNode fetchPokemonSpeciesList(int limit, int offset) {
		return restClient.get()
				.uri(uriBuilder -> uriBuilder
						.path(PATH_POKEMON_SPECIES_LIST)
						.queryParam(QUERY_PARAM_LIMIT, limit)
						.queryParam(QUERY_PARAM_OFFSET, offset)
						.build())
				.retrieve()
				.body(JsonNode.class);
	}

	public JsonNode fetchType(String typeName) {
		return restClient.get()
				.uri(PATH_TYPE, typeName)
				.retrieve()
				.body(JsonNode.class);
	}
}
