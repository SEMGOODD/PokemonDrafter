package com.example.pokemon.service;

import com.example.pokemon.config.SearchConstants;
import com.example.pokemon.model.Pokemon;
import com.example.pokemon.model.PokemonSummary;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PokemonSearchService {

	private final PokemonService pokemonService;
	private final TypePokemonListService typePokemonListService;

	public PokemonSearchService(PokemonService pokemonService, TypePokemonListService typePokemonListService) {
		this.pokemonService = pokemonService;
		this.typePokemonListService = typePokemonListService;
	}

	public List<PokemonSummary> search(String name, String type1, String type2, int page, int pageSize) {
		int boundedPageSize = Math.min(Math.max(pageSize, SearchConstants.PAGE_SIZE_MIN), SearchConstants.PAGE_SIZE_MAX);
		int boundedPage = Math.max(page, SearchConstants.PAGE_MIN);

		if (hasText(name)) {
			return searchByName(name);
		}
		List<Integer> candidateIds = resolveCandidateIds(type1, type2);
		return paginateAndResolve(candidateIds, boundedPage, boundedPageSize);
	}

	private List<PokemonSummary> searchByName(String name) {
		Pokemon pokemon = pokemonService.getByName(name);
		return List.of(toSummary(pokemon));
	}

	private List<Integer> resolveCandidateIds(String type1, String type2) {
		boolean hasType1 = hasText(type1);
		boolean hasType2 = hasText(type2);
		if (!hasType1 && !hasType2) {
			return Collections.emptyList();
		}
		if (hasType1 && hasType2) {
			return intersect(
					typePokemonListService.getPokemonIdsForType(type1),
					typePokemonListService.getPokemonIdsForType(type2)
			);
		}
		String singleType = hasType1 ? type1 : type2;
		return typePokemonListService.getPokemonIdsForType(singleType);
	}

	private List<Integer> intersect(List<Integer> first, List<Integer> second) {
		Set<Integer> secondSet = new HashSet<>(second);
		return first.stream().filter(secondSet::contains).toList();
	}

	private List<PokemonSummary> paginateAndResolve(List<Integer> ids, int page, int pageSize) {
		int from = page * pageSize;
		if (from >= ids.size()) {
			return Collections.emptyList();
		}
		int to = Math.min(from + pageSize, ids.size());
		return ids.subList(from, to).stream()
				.map(pokemonService::getById)
				.map(this::toSummary)
				.toList();
	}

	private PokemonSummary toSummary(Pokemon pokemon) {
		return new PokemonSummary(pokemon.id(), pokemon.name(), pokemon.types(), pokemon.sprite());
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
