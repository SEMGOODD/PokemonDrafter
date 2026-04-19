package com.example.combat.model;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BattlePokemon {
	private int id;
	private String name;
	private List<String> types;
	private String sprite;
	private boolean ko;

	public static BattlePokemon from(PokemonData data) {
		BattlePokemon bp = new BattlePokemon();
		bp.id = data.id();
		bp.name = data.name();
		bp.types = data.types();
		bp.sprite = data.sprite();
		bp.ko = false;
		return bp;
	}
}
