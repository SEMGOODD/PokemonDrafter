package com.example.logs.service;

import com.example.logs.domain.LogEntry;
import com.example.logs.dto.LogQueryFilter;
import com.example.logs.repository.LogEntryRepository;
import com.example.logs.repository.LogEntrySpecifications;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LogQueryService {

	private final LogEntryRepository repository;
	private final int defaultLimit;
	private final int maxLimit;

	public LogQueryService(LogEntryRepository repository,
			@Value("${logs.query.default-limit:100}") int defaultLimit,
			@Value("${logs.query.max-limit:1000}") int maxLimit) {
		this.repository = repository;
		this.defaultLimit = defaultLimit;
		this.maxLimit = maxLimit;
	}

	public List<LogEntry> search(LogQueryFilter filter) {
		int limit = clamp(filter.getLimit() != null ? filter.getLimit() : defaultLimit);
		PageRequest page = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"));
		return repository.findAll(LogEntrySpecifications.fromFilter(filter), page).getContent();
	}

	public List<String> listServices() {
		return repository.findDistinctServices();
	}

	private int clamp(int requested) {
		if (requested < 1) {
			return defaultLimit;
		}
		return Math.min(requested, maxLimit);
	}
}
