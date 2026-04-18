package com.example.pokemon.controller;

import com.example.pokemon.model.TypeEffectiveness;
import com.example.pokemon.service.TypeEffectivenessService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/types")
public class TypeController {

	private final TypeEffectivenessService typeEffectivenessService;

	public TypeController(TypeEffectivenessService typeEffectivenessService) {
		this.typeEffectivenessService = typeEffectivenessService;
	}

	@GetMapping("/effectiveness")
	public Map<String, Map<String, Double>> getEffectiveness() {
		TypeEffectiveness effectiveness = typeEffectivenessService.getEffectiveness();
		return effectiveness.matrix();
	}
}
