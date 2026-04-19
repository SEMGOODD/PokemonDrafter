package com.example.pokemon.config;

import java.time.Duration;

public final class CacheConstants {

	public static final String KEY_PREFIX_POKEMON = "pokemon:";
	public static final String KEY_PREFIX_POKEMON_NAME = "pokemon:name:";
	public static final String KEY_PREFIX_SPECIES = "species:";
	public static final String KEY_PREFIX_TYPE_POKEMON = "type:";
	public static final String KEY_SUFFIX_TYPE_POKEMON = ":pokemon";
	public static final String KEY_TYPE_EFFECTIVENESS = "types:effectiveness";
	public static final String KEY_POKEMON_NAME_INDEX = "pokemon:name-index";

	public static final Duration TTL_POKEMON = Duration.ofDays(7);
	public static final Duration TTL_SPECIES = Duration.ofDays(7);
	public static final Duration TTL_TYPE_LIST = Duration.ofDays(7);
	public static final Duration TTL_EFFECTIVENESS = Duration.ofDays(30);
	public static final Duration TTL_NAME_INDEX = Duration.ofDays(30);

	private CacheConstants() {
	}
}
