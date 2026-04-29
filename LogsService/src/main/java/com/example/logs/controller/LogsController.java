package com.example.logs.controller;

import com.example.logs.domain.LogEntry;
import com.example.logs.dto.LogQueryFilter;
import com.example.logs.service.LogQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/logs")
public class LogsController {

	private final LogQueryService queryService;

	public LogsController(LogQueryService queryService) {
		this.queryService = queryService;
	}

	@GetMapping
	public List<LogEntry> search(
			@RequestParam(required = false) String service,
			@RequestParam(required = false) String level,
			@RequestParam(required = false) String q,
			@RequestParam(required = false) Integer limit) {
		LogQueryFilter filter = LogQueryFilter.builder()
				.service(service)
				.level(level)
				.q(q)
				.limit(limit)
				.build();
		return queryService.search(filter);
	}

	@GetMapping("/services")
	public List<String> services() {
		return queryService.listServices();
	}
}
