package com.example.logs.repository;

import com.example.logs.domain.LogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface LogEntryRepository extends JpaRepository<LogEntry, Long>, JpaSpecificationExecutor<LogEntry> {

	@Query("SELECT DISTINCT l.service FROM LogEntry l ORDER BY l.service ASC")
	List<String> findDistinctServices();
}
