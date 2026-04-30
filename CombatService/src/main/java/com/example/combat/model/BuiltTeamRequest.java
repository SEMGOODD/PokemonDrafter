package com.example.combat.model;

import java.util.List;

public record BuiltTeamRequest(String playerId, List<Integer> pokemonIds) {}