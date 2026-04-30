package com.example.logs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
