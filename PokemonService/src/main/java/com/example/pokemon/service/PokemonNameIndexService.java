package com.example.pokemon.service;

import com.example.pokemon.cache.NameIndexCacheRepository;
import com.example.pokemon.client.PokeApiClient;
import com.example.pokemon.mapper.PokeApiMapper;
import com.example.pokemon.model.NameIndexEntry;
import tools.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class PokemonNameIndexService {

	private static final Logger LOG = LoggerFactory.getLogger(PokemonNameIndexService.class);

	private static final int SPECIES_LIST_LIMIT = 20000;
	private static final int SPECIES_LIST_OFFSET = 0;
	private static final int MAX_CONCURRENT_FRENCH_FETCHES = 10;

	private final PokeApiClient pokeApiClient;
	private final PokeApiMapper mapper;
	private final NameIndexCacheRepository cache;

	private final AtomicReference<List<NameIndexEntry>> indexRef = new AtomicReference<>(List.of());

	public PokemonNameIndexService(
			PokeApiClient pokeApiClient,
			PokeApiMapper mapper,
			NameIndexCacheRepository cache) {
		this.pokeApiClient = pokeApiClient;
		this.mapper = mapper;
		this.cache = cache;
	}

	@EventListener(ApplicationReadyEvent.class)
	void initialize() {
		cache.find().ifPresentOrElse(
				this::useCachedIndex,
				() -> CompletableFuture.runAsync(this::rebuildFromScratch));
	}

	public List<Integer> findIdsByPrefix(String prefix, int maxResults) {
		if (prefix == null || prefix.isBlank()) {
			return List.of();
		}
		String needle = prefix.toLowerCase(Locale.ROOT);
		List<Integer> ids = new ArrayList<>();
		for (NameIndexEntry entry : indexRef.get()) {
			if (matches(entry, needle)) {
				ids.add(entry.id());
				if (ids.size() >= maxResults) {
					break;
				}
			}
		}
		return ids;
	}

	public List<Integer> getAllIds() {
		return indexRef.get().stream()
				.map(NameIndexEntry::id)
				.toList();
	}

	public String getFrenchName(int id) {
		for (NameIndexEntry entry : indexRef.get()) {
			if (entry.id() == id) {
				return entry.nameFr();
			}
		}
		return null;
	}

	private void useCachedIndex(List<NameIndexEntry> loaded) {
		indexRef.set(loaded);
		LOG.info("Name index loaded from Redis: {} entries", loaded.size());
	}

	private void rebuildFromScratch() {
		try {
			List<NameIndexEntry> base = fetchEnglishNameIndex();
			indexRef.set(base);
			LOG.info("English name index built ({} entries), enriching with French names...", base.size());
			List<NameIndexEntry> enriched = enrichWithFrenchNames(base);
			indexRef.set(enriched);
			cache.save(enriched);
			LOG.info("Name index fully built and cached ({} entries)", enriched.size());
		} catch (RuntimeException e) {
			LOG.error("Name index build failed; searches by name will return empty until next restart", e);
		}
	}

	private List<NameIndexEntry> fetchEnglishNameIndex() {
		JsonNode listNode = pokeApiClient.fetchPokemonSpeciesList(SPECIES_LIST_LIMIT, SPECIES_LIST_OFFSET);
		return mapper.extractNameIndexFromSpeciesListNode(listNode);
	}

	private List<NameIndexEntry> enrichWithFrenchNames(List<NameIndexEntry> base) {
		Semaphore limiter = new Semaphore(MAX_CONCURRENT_FRENCH_FETCHES);
		try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
			List<CompletableFuture<NameIndexEntry>> futures = new ArrayList<>(base.size());
			for (NameIndexEntry entry : base) {
				futures.add(CompletableFuture.supplyAsync(() -> fetchFrenchFor(entry, limiter), pool));
			}
			List<NameIndexEntry> enriched = new ArrayList<>(base.size());
			for (CompletableFuture<NameIndexEntry> future : futures) {
				enriched.add(future.join());
			}
			return enriched;
		}
	}

	private NameIndexEntry fetchFrenchFor(NameIndexEntry entry, Semaphore limiter) {
		try {
			limiter.acquire();
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			return entry;
		}
		try {
			JsonNode speciesNode = pokeApiClient.fetchPokemonSpecies(entry.id());
			String nameFr = mapper.extractFrenchNameFromSpeciesNode(speciesNode);
			return new NameIndexEntry(entry.id(), entry.nameEn(), nameFr);
		} catch (RuntimeException e) {
			LOG.debug("French name enrichment skipped for species id {}: {}", entry.id(), e.getMessage());
			return entry;
		} finally {
			limiter.release();
		}
	}

	private boolean matches(NameIndexEntry entry, String lowerCaseNeedle) {
		if (entry.nameFr() == null) {
			return false;
		}
		return entry.nameFr().toLowerCase(Locale.ROOT).startsWith(lowerCaseNeedle);
	}
}
