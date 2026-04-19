package com.example.Gateway.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final KeycloakAdminService keycloakAdmin;

	public AuthController(KeycloakAdminService keycloakAdmin) {
		this.keycloakAdmin = keycloakAdmin;
	}

	@PostMapping("/signup")
	public Mono<ResponseEntity<SignupResponse>> signup(@Valid @RequestBody SignupRequest request) {
		return keycloakAdmin.createUserWithRole(request)
				.map(body -> ResponseEntity.status(HttpStatus.CREATED).body(body));
	}

	// Always 202 Accepted, regardless of whether the email exists, to prevent user enumeration.
	@PostMapping("/forgot-password")
	public Mono<ResponseEntity<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		return keycloakAdmin.sendResetPasswordEmail(request.mail())
				.thenReturn(ResponseEntity.accepted().<Void>build())
				.onErrorReturn(ResponseEntity.accepted().build());
	}
}
