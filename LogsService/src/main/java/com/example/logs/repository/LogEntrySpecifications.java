package com.example.logs.repository;

import com.example.logs.domain.LogEntry;
import com.example.logs.dto.LogQueryFilter;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Specifications JPA composables pour LogQueryFilter. Chaque critère est
 * appliqué uniquement s'il est non vide ; ajouter un nouveau critère consiste
 * simplement à étendre la liste retournée par fromFilter().
 */
public final class LogEntrySpecifications {

	private static final String FIELD_SERVICE = "service";
	private static final String FIELD_LEVEL = "level";
	private static final String FIELD_MESSAGE = "message";
	private static final String LIKE_WILDCARD = "%";

	private LogEntrySpecifications() {
	}

	public static Specification<LogEntry> fromFilter(LogQueryFilter filter) {
		List<Specification<LogEntry>> specs = new ArrayList<>();
		if (hasText(filter.getService())) {
			specs.add(equalIgnoreCase(FIELD_SERVICE, filter.getService()));
		}
		if (hasText(filter.getLevel())) {
			specs.add(equalIgnoreCase(FIELD_LEVEL, filter.getLevel()));
		}
		if (hasText(filter.getQ())) {
			specs.add(messageContains(filter.getQ()));
		}
		return specs.stream().reduce(Specification::and).orElse(null);
	}

	private static Specification<LogEntry> equalIgnoreCase(String field, String value) {
		return (root, query, cb) -> cb.equal(cb.lower(root.get(field)), value.toLowerCase());
	}

	private static Specification<LogEntry> messageContains(String text) {
		String pattern = LIKE_WILDCARD + text.toLowerCase() + LIKE_WILDCARD;
		return (root, query, cb) -> cb.like(cb.lower(root.get(FIELD_MESSAGE)), pattern);
	}

	private static boolean hasText(String s) {
		return s != null && !s.isBlank();
	}
}
