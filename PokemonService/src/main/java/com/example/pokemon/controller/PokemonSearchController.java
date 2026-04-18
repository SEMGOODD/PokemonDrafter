package com.example.pokemon.controller;

import com.example.pokemon.config.SearchConstants;
import com.example.pokemon.model.PokemonSummary;
import com.example.pokemon.service.PokemonSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/pokemon")
public class PokemonSearchController {

	private final PokemonSearchService pokemonSearchService;

	public PokemonSearchController(PokemonSearchService pokemonSearchService) {
		this.pokemonSearchService = pokemonSearchService;
	}

	@GetMapping("/search")
	public List<PokemonSummary> search(
			@RequestParam(required = false) String name,
			@RequestParam(required = false) String type1,
			@RequestParam(required = false) String type2,
			@RequestParam(required = false, defaultValue = "" + SearchConstants.PAGE_MIN) int page,
			@RequestParam(required = false, defaultValue = "" + SearchConstants.PAGE_SIZE_DEFAULT) int pageSize
	) {
		return pokemonSearchService.search(name, type1, type2, page, pageSize);
	}
}
