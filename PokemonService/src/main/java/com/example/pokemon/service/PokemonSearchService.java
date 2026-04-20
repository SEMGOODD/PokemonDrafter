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

	private static final int VARIANT_FORM_ID_THRESHOLD = 10000;

	private final PokemonService pokemonService;
	private final TypePokemonListService typePokemonListService;
	private final PokemonNameIndexService nameIndexService;

	public PokemonSearchService(
			PokemonService pokemonService,
			TypePokemonListService typePokemonListService,
			PokemonNameIndexService nameIndexService
	) {
		this.pokemonService = pokemonService;
		this.typePokemonListService = typePokemonListService;
		this.nameIndexService = nameIndexService;
	}

	public List<PokemonSummary> search(String name, String type1, String type2, int page, int pageSize) {
		int boundedPageSize = Math.min(Math.max(pageSize, SearchConstants.PAGE_SIZE_MIN), SearchConstants.PAGE_SIZE_MAX);
		int boundedPage = Math.max(page, SearchConstants.PAGE_MIN);

		List<Integer> candidateIds;
		if (hasValidNamePrefix(name)) {
			candidateIds = nameIndexService.findIdsByPrefix(name, SearchConstants.NAME_PREFIX_MAX_MATCHES);
			if (hasText(type1) || hasText(type2)) {
				candidateIds = intersectWithTypeFilter(candidateIds, type1, type2);
			}
		} else {
			candidateIds = resolveCandidateIdsByType(type1, type2);
		}
		return paginateAndResolve(candidateIds, boundedPage, boundedPageSize);
	}

	private boolean hasValidNamePrefix(String name) {
		return hasText(name) && name.trim().length() >= SearchConstants.NAME_PREFIX_MIN_LENGTH;
	}

	private List<Integer> resolveCandidateIdsByType(String type1, String type2) {
		boolean hasType1 = hasText(type1);
		boolean hasType2 = hasText(type2);
		if (!hasType1 && !hasType2) {
			return Collections.emptyList();
		}
		List<Integer> ids;
		if (hasType1 && hasType2) {
			ids = intersect(
					typePokemonListService.getPokemonIdsForType(type1),
					typePokemonListService.getPokemonIdsForType(type2)
			);
		} else {
			String singleType = hasType1 ? type1 : type2;
			ids = typePokemonListService.getPokemonIdsForType(singleType);
		}
		return filterOutVariantForms(ids);
	}

	private List<Integer> filterOutVariantForms(List<Integer> ids) {
		return ids.stream()
				.filter(id -> id < VARIANT_FORM_ID_THRESHOLD)
				.toList();
	}

	private List<Integer> intersectWithTypeFilter(List<Integer> nameCandidates, String type1, String type2) {
		List<Integer> typeCandidates = resolveCandidateIdsByType(type1, type2);
		return intersect(nameCandidates, typeCandidates);
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
				.map(this::safeFetchSummary)
				.filter(summary -> summary != null)
				.toList();
	}

	private PokemonSummary safeFetchSummary(int id) {
		try {
			Pokemon pokemon = pokemonService.getById(id);
			return new PokemonSummary(pokemon.id(), pokemon.name(), pokemon.types(), pokemon.sprite());
		} catch (RuntimeException e) {
			return null;
		}
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
