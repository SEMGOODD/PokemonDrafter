package com.example.Gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

        private static final String CLAIM_REALM_ACCESS = "realm_access";
        private static final String CLAIM_ROLES = "roles";
        private static final String AUTHORITY_PREFIX = "ROLE_";
        private static final String ROLE_ADMIN = "admin";

        @Bean
        public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
                http
                                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                                .cors(Customizer.withDefaults())
                                .authorizeExchange(exchanges -> exchanges
                                                .pathMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**")
                                                .permitAll()
                                                .pathMatchers("/actuator/**").permitAll()
                                                .pathMatchers("/api/pokemon/**", "/api/types/**").permitAll()
                                                .pathMatchers("/api/auth/**").permitAll()
                                                .pathMatchers("/api/logs/**").hasRole(ROLE_ADMIN)
                                                .anyExchange().authenticated())
                                .oauth2ResourceServer(oauth2 -> oauth2
                                                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter())));
                return http.build();
        }

        @Bean
        public ReactiveJwtDecoder jwtDecoder() {
                NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder
                                .withJwkSetUri(System.getenv().getOrDefault("KEYCLOAK_URL", "http://keycloak:8080")
                                                + "/realms/pokemon-drafter/protocol/openid-connect/certs")
                                .build();
                decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                                new JwtTimestampValidator()));
                return decoder;
        }

        /**
         * Keycloak place les rôles realm dans le claim {@code realm_access.roles}.
         * Le converter par défaut de Spring ne lit que {@code scope}/{@code authorities},
         * d'où l'extraction explicite et le préfixe ROLE_ pour matcher hasRole().
         */
        private static ReactiveJwtAuthenticationConverter keycloakJwtConverter() {
                ReactiveJwtAuthenticationConverter converter = new ReactiveJwtAuthenticationConverter();
                converter.setJwtGrantedAuthoritiesConverter(jwt -> Flux.fromIterable(extractRealmRoles(jwt)));
                return converter;
        }

        @SuppressWarnings("unchecked")
        private static List<GrantedAuthority> extractRealmRoles(Jwt jwt) {
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
