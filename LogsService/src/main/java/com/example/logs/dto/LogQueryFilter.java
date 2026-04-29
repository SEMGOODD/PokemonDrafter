package com.example.logs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Critères de recherche utilisés par la console admin. Tous les champs sont
 * optionnels : un filtre nul est ignoré dans la requête JPA. Conçu pour
 * accueillir sans changement de schéma de futurs critères (dateFrom, dateTo,
 * userId, ...).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogQueryFilter {

	private String service;
	private String level;
	private String q;
	private Integer limit;
}
