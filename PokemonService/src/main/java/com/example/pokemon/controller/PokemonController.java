package com.example.pokemon.controller;

import com.example.pokemon.model.Pokemon;
import com.example.pokemon.service.PokemonService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pokemon")
public class PokemonController {

	private static final String RESPONSE_KEY_TYPES = "types";

	private final PokemonService pokemonService;

	public PokemonController(PokemonService pokemonService) {
		this.pokemonService = pokemonService;
	}

	@GetMapping("/{id}")
	public Pokemon getById(@PathVariable int id) {
		return pokemonService.getById(id);
	}

	@GetMapping("/{id}/types")
	public Map<String, List<String>> getTypes(@PathVariable int id) {
		return Map.of(RESPONSE_KEY_TYPES, pokemonService.getById(id).types());
	}
}
