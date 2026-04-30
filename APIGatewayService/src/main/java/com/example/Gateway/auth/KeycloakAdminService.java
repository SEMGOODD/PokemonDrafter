package com.example.Gateway.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
public class KeycloakAdminService {

	private static final String COLOR_RED = "red";
	private static final String ROLE_RED_PLAYER = "red_player";
	private static final String ROLE_BLUE_PLAYER = "blue_player";
	private static final String ADMIN_CLI_CLIENT_ID = "admin-cli";
	private static final String MASTER_REALM = "master";
	private static final String LOCATION_HEADER = "Location";
	private static final String TOKEN_FIELD = "access_token";

	private static final String TOKEN_PATH_TEMPLATE = "/realms/{realm}/protocol/openid-connect/token";
	private static final String USERS_PATH_TEMPLATE = "/admin/realms/{realm}/users";
	private static final String ROLE_PATH_TEMPLATE = "/admin/realms/{realm}/roles/{role}";
	private static final String USER_REALM_ROLES_PATH_TEMPLATE = "/admin/realms/{realm}/users/{userId}/role-mappings/realm";
	private static final String USER_EXECUTE_ACTIONS_EMAIL_PATH_TEMPLATE = "/admin/realms/{realm}/users/{userId}/execute-actions-email";
	private static final String UPDATE_PASSWORD_ACTION = "UPDATE_PASSWORD";

	private final WebClient webClient;
	private final String realm;
	private final String adminUser;
	private final String adminPassword;

	public KeycloakAdminService(
			WebClient keycloakWebClient,
			@Value("${keycloak.realm}") String realm,
			@Value("${keycloak.admin.username}") String adminUser,
			@Value("${keycloak.admin.password}") String adminPassword) {
		this.webClient = keycloakWebClient;
		this.realm = realm;
		this.adminUser = adminUser;
		this.adminPassword = adminPassword;
	}

	public Mono<Void> sendResetPasswordEmail(String email) {
		return getAdminToken()
				.flatMap(token -> findUserIdByEmail(email, token)
						.flatMap(userId -> triggerUpdatePasswordEmail(userId, token)));
	}

	public Mono<SignupResponse> createUserWithRole(SignupRequest request) {
		String targetRole = COLOR_RED.equals(request.couleur()) ? ROLE_RED_PLAYER : ROLE_BLUE_PLAYER;
		return getAdminToken()
				.flatMap(token -> createUser(request, token)
						.flatMap(userId -> getRealmRole(targetRole, token)
								.flatMap(role -> assignRealmRole(userId, role, token)
										.thenReturn(new SignupResponse(userId, request.couleur())))));
	}

	public Mono<Map<String, String>> findUserByUsername(String username) {
		return getAdminToken()
				.flatMap(token -> webClient.get()
						.uri(builder -> builder.path(USERS_PATH_TEMPLATE)
								.queryParam("username", username)
								.queryParam("exact", true)
								.build(realm))
						.headers(h -> h.setBearerAuth(token))
						.retrieve()
						.bodyToMono(
								new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {
								})
						.flatMap(users -> {
							if (users.isEmpty()) {
								return Mono.error(
										new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
							}
							Map<String, Object> user = users.get(0);
							return Mono.just(Map.of(
									"id", (String) user.get("id"),
									"username", (String) user.get("username")));
						})
						.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException));
	}

	private Mono<String> getAdminToken() {
		return webClient.post()
				.uri(TOKEN_PATH_TEMPLATE, MASTER_REALM)
				.contentType(MediaType.APPLICATION_FORM_URLENCODED)
				.body(BodyInserters.fromFormData("grant_type", "password")
						.with("client_id", ADMIN_CLI_CLIENT_ID)
						.with("username", adminUser)
						.with("password", adminPassword))
				.retrieve()
				.bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
				})
				.map(body -> (String) body.get(TOKEN_FIELD));
	}

	private Mono<String> createUser(SignupRequest request, String adminToken) {
		Map<String, Object> payload = Map.of(
				"username", request.pseudo(),
				"email", request.mail(),
				"firstName", request.prenom(),
				"lastName", request.nom(),
				"enabled", true,
				"emailVerified", false,
				"credentials", List.of(Map.of(
						"type", "password",
						"value", request.password(),
						"temporary", false)));
		return webClient.post()
				.uri(USERS_PATH_TEMPLATE, realm)
				.headers(h -> h.setBearerAuth(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(payload)
				.retrieve()
				.onStatus(HttpStatus.CONFLICT::equals,
						response -> Mono
								.error(new ResponseStatusException(HttpStatus.CONFLICT, "Utilisateur deja existant")))
				.toBodilessEntity()
				.map(entity -> {
					String location = entity.getHeaders().getFirst(LOCATION_HEADER);
					if (location == null) {
						throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
								"Reponse Keycloak sans header Location");
					}
					return location.substring(location.lastIndexOf('/') + 1);
				})
				.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException);
	}

	private Mono<Map<String, Object>> getRealmRole(String roleName, String adminToken) {
		return webClient.get()
				.uri(ROLE_PATH_TEMPLATE, realm, roleName)
				.headers(h -> h.setBearerAuth(adminToken))
				.retrieve()
				.bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
				})
				.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException);
	}

	private Mono<Void> assignRealmRole(String userId, Map<String, Object> role, String adminToken) {
		return webClient.post()
				.uri(USER_REALM_ROLES_PATH_TEMPLATE, realm, userId)
				.headers(h -> h.setBearerAuth(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(List.of(role))
				.retrieve()
				.toBodilessEntity()
				.then()
				.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException);
	}

	public Mono<Void> changeUserColor(String username, String newColor) {
		String roleToAdd = COLOR_RED.equals(newColor) ? ROLE_RED_PLAYER : ROLE_BLUE_PLAYER;
		String roleToRemove = COLOR_RED.equals(newColor) ? ROLE_BLUE_PLAYER : ROLE_RED_PLAYER;

		return getAdminToken()
				.flatMap(token -> findUserIdByUsername(username, token)
						.flatMap(userId -> getRealmRole(roleToRemove, token)
								.flatMap(oldRole -> removeRealmRole(userId, oldRole, token))
								.then(getRealmRole(roleToAdd, token))
								.flatMap(newRole -> assignRealmRole(userId, newRole, token))));
	}

	private Mono<String> findUserIdByUsername(String username, String adminToken) {
		return webClient.get()
				.uri(builder -> builder.path(USERS_PATH_TEMPLATE)
						.queryParam("username", username)
						.queryParam("exact", true)
						.build(realm))
				.headers(h -> h.setBearerAuth(adminToken))
				.retrieve()
				.bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {
				})
				.flatMap(users -> {
					if (users.isEmpty()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
					}
					return Mono.just((String) users.get(0).get("id"));
				})
				.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException);
	}

	private Mono<Void> removeRealmRole(String userId, Map<String, Object> role, String adminToken) {
		return webClient.method(org.springframework.http.HttpMethod.DELETE)
				.uri(USER_REALM_ROLES_PATH_TEMPLATE, realm, userId)
				.headers(h -> h.setBearerAuth(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(List.of(role))
				.retrieve()
				.toBodilessEntity()
				.then()
				.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException);
	}

	private Mono<String> findUserIdByEmail(String email, String adminToken) {
		return webClient.get()
				.uri(builder -> builder.path(USERS_PATH_TEMPLATE)
						.queryParam("email", email)
						.queryParam("exact", true)
						.build(realm))
				.headers(h -> h.setBearerAuth(adminToken))
				.retrieve()
				.bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {
				})
				.flatMap(users -> {
					if (users.isEmpty()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Email inconnu"));
					}
					return Mono.just((String) users.get(0).get("id"));
				})
				.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException);
	}

	private Mono<Void> triggerUpdatePasswordEmail(String userId, String adminToken) {
		return webClient.put()
				.uri(USER_EXECUTE_ACTIONS_EMAIL_PATH_TEMPLATE, realm, userId)
				.headers(h -> h.setBearerAuth(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(List.of(UPDATE_PASSWORD_ACTION))
				.retrieve()
				.toBodilessEntity()
				.then()
				.onErrorMap(WebClientResponseException.class, KeycloakAdminService::toResponseStatusException);
	}

	private static ResponseStatusException toResponseStatusException(WebClientResponseException e) {
		return new ResponseStatusException(e.getStatusCode(), "Keycloak a refuse la requete: " + e.getMessage(), e);
	}
}
