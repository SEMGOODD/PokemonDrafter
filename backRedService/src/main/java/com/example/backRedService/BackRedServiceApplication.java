package com.example.backRedService;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class BackRedServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackRedServiceApplication.class, args);
	}

}
