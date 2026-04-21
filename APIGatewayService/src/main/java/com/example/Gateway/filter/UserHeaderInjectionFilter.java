package com.example.Gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Component
public class UserHeaderInjectionFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .flatMap(ctx -> {
                    var auth = ctx.getAuthentication();
                    if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
                        return chain.filter(exchange);
                    }

                    String userId = jwt.getClaimAsString("preferred_username");
                    String color = resolveColor(jwt);

                    ServerWebExchange mutated = exchange.mutate()
                            .request(r -> r
                                    .header("X-User-Id", userId != null ? userId : "")
                                    .header("X-User-Color", color))
                            .build();

                    return chain.filter(mutated);
                })
                .switchIfEmpty(chain.filter(exchange));
    }

    private String resolveColor(Jwt jwt) {
        try {
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess == null)
                return "unknown";

            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) realmAccess.get("roles");
            if (roles == null)
                return "unknown";

            if (roles.contains("red_player"))
                return "red";
            if (roles.contains("blue_player"))
                return "blue";
            if (roles.contains("admin"))
                return "admin";
        } catch (Exception ignored) {
        }
        return "unknown";
    }

    @Override
    public int getOrder() {
        // Run after RoleAuthorizationFilter, so auth is already checked
        return 0;
    }
}