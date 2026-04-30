package com.example.combat.controller;

import com.example.combat.model.ColorChangeRequest;
import com.example.combat.model.PlayerResponse;
import com.example.combat.service.PlayerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/players")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @PostMapping("/me/register")
    public PlayerResponse register(@AuthenticationPrincipal Jwt jwt) {
        String playerId = jwt.getClaimAsString("preferred_username");
        String color = extractColor(jwt);
        return playerService.getOrCreate(playerId, color);
    }

    @GetMapping("/me")
    public PlayerResponse getMe(@AuthenticationPrincipal Jwt jwt) {
        String playerId = jwt.getClaimAsString("preferred_username");
        String color = extractColor(jwt);
        return playerService.getOrCreate(playerId, color);
    }

    @PutMapping("/me/color")
    public PlayerResponse changeColor(@AuthenticationPrincipal Jwt jwt,
                                      @RequestBody ColorChangeRequest request) {
        String playerId = jwt.getClaimAsString("preferred_username");
        return playerService.changeColor(playerId, request.color());
    }

    private String extractColor(Jwt jwt) {
        try {
            var realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess != null) {
                Object rolesObj = realmAccess.get("roles");
                if (rolesObj instanceof java.util.List<?> roles) {
                    if (roles.contains("blue_player")) return "blue";
                    if (roles.contains("red_player")) return "red";
                }
            }
        } catch (Exception ignored) {}
        return "red";
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }
}