package com.example.Gateway.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

	@PutMapping("/api/users/me/color")
	public Mono<Void> changeColor(
			@AuthenticationPrincipal Jwt jwt,
			@RequestBody Map<String, String> body) {
		String username = jwt.getClaimAsString("preferred_username");
		String newColor = body.get("color");
		if (newColor == null || (!newColor.equals("red") && !newColor.equals("blue"))) {
			return Mono.error(new org.springframework.web.server.ResponseStatusException(
					org.springframework.http.HttpStatus.BAD_REQUEST, "Color must be 'red' or 'blue'"));
		}
		return keycloakAdminService.changeUserColor(username, newColor);
	}
}