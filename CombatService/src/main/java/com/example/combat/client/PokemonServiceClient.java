package com.example.combat.client;

import com.example.combat.model.BattlePokemon;
import com.example.combat.model.PokemonData;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class PokemonServiceClient {

	private final RestClient restClient;

	public PokemonServiceClient(RestClient pokemonServiceRestClient) {
		this.restClient = pokemonServiceRestClient;
	}

	public BattlePokemon getPokemon(int id) {
		PokemonData data = restClient.get()
				.uri("/pokemon/{id}", id)
				.retrieve()
				.body(PokemonData.class);
		return BattlePokemon.from(data);
	}

	public Map<String, Map<String, Double>> getTypeEffectiveness() {
		return restClient.get()
				.uri("/types/effectiveness")
				.retrieve()
				.body(new ParameterizedTypeReference<>() {});
	}
}
