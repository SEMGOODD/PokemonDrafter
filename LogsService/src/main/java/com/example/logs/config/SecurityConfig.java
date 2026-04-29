package com.example.logs.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * La gateway exige déjà le rôle admin sur /api/logs/**, mais on revérifie ici
 * en défense en profondeur : le service refuse tout JWT qui n'a pas le rôle
 * admin extrait du claim Keycloak realm_access.roles.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private static final String CLAIM_REALM_ACCESS = "realm_access";
	private static final String CLAIM_ROLES = "roles";
	private static final String ROLE_ADMIN = "admin";
	private static final String AUTHORITY_PREFIX = "ROLE_";
	private static final String SPRING_AUTHORITY_ADMIN = AUTHORITY_PREFIX + ROLE_ADMIN;

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/actuator/**").permitAll()
						.requestMatchers("/logs/**").hasAuthority(SPRING_AUTHORITY_ADMIN)
						.anyRequest().authenticated())
				.oauth2ResourceServer(oauth2 -> oauth2
						.jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter())))
				.sessionManagement(session -> session
						.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.csrf(csrf -> csrf.disable());
		return http.build();
	}

	@Bean
	public JwtDecoder jwtDecoder() {
		NimbusJwtDecoder decoder = NimbusJwtDecoder
				.withJwkSetUri(System.getenv().getOrDefault("KEYCLOAK_URL", "http://keycloak:8080")
						+ "/realms/pokemon-drafter/protocol/openid-connect/certs")
				.build();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator()));
		return decoder;
	}

	private static JwtAuthenticationConverter keycloakJwtConverter() {
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(SecurityConfig::extractRealmRoles);
		return converter;
	}

	@SuppressWarnings("unchecked")
	private static Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
		Object realmAccess = jwt.getClaim(CLAIM_REALM_ACCESS);
		if (!(realmAccess instanceof Map<?, ?> realmAccessMap)) {
			return List.of();
		}
		Object roles = ((Map<String, Object>) realmAccessMap).get(CLAIM_ROLES);
		if (!(roles instanceof List<?> roleList)) {
			return List.of();
		}
		return roleList.stream()
				.filter(String.class::isInstance)
				.map(String.class::cast)
				.<GrantedAuthority>map(role -> new SimpleGrantedAuthority(AUTHORITY_PREFIX + role))
				.toList();
	}
}
