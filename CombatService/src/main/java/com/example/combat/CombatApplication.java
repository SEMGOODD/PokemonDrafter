package com.example.combat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CombatApplication {
	public static void main(String[] args) {
		SpringApplication.run(CombatApplication.class, args);
	}
}
