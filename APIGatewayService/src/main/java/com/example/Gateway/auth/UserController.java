package com.example.Gateway.auth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
public class UserController {

	private final KeycloakAdminService keycloakAdminService;

	public UserController(KeycloakAdminService keycloakAdminService) {
		this.keycloakAdminService = keycloakAdminService;
	}

	@GetMapping("/api/users/search")
	public Mono<Map<String, String>> searchByUsername(@RequestParam String username) {
		return keycloakAdminService.findUserByUsername(username);
	}
}
