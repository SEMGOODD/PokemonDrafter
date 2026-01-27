package com.example.backBlueService;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class BackBlueServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackBlueServiceApplication.class, args);
	}

}
