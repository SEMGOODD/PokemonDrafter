package com.example.Gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

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
                                                .anyExchange().authenticated())
                                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {
                                }));
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

}