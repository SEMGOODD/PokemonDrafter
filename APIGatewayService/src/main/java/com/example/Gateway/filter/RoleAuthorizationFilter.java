package com.example.Gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RoleAuthorizationFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getAuthorities())
                .flatMap(authorities -> {
                    boolean isRedPath = path.contains("/api/red");
                    boolean isBluePath = path.contains("/api/blue");
                    boolean hasRedRole = authorities.stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_red_player"));
                    boolean hasBlueRole = authorities.stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_blue_player"));

                    if ((isRedPath && !hasRedRole) || (isBluePath && !hasBlueRole)) {
                        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                        return exchange.getResponse().setComplete();
                    }

                    return chain.filter(exchange);
                })
                .switchIfEmpty(chain.filter(exchange));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}