# gateway-service

API Gateway en Spring Cloud Gateway (réactif). Point d'entrée unique : valide le JWT Keycloak, applique les règles d'autorisation par route, injecte l'identité dans les en-têtes en aval, puis route vers le bon microservice.

Stack : Spring Boot 3.4.4 · Spring Cloud Gateway 2024.0.1 · Java 21 · Gradle.

---

## Rôle

- Vérifie le JWT (signature + expiration) via les JWKs Keycloak.
- Distingue routes publiques, authentifiées et réservées admin.
- Décode le claim `realm_access.roles` Keycloak pour évaluer `hasRole('admin')` côté gateway.
- Délègue tout le reste aux services métier.
- Émet ses logs >= INFO sur le topic Kafka `logs-service` via l'appender `KafkaLogbackAppender` (`logback-spring.xml`).

---

## Routes proxifiées

Définies dans [src/main/resources/application.yml](src/main/resources/application.yml).

| Route gateway | Cible | Auth |
|---|---|---|
| `GET /api/pokemon/**` | `pokemon-service:8000` | Public |
| `GET /api/types/**` | `pokemon-service:8000` | Public |
| `POST /api/auth/**` | services internes | Public |
| `/api/combat/**` | `combat-service:8000` | JWT requis |
| `/api/chat/**` | `chat-service:8000` (WebSocket) | JWT requis |
| `/api/logs/**` | `logs-service:8000` | JWT + rôle `admin` |

Toute autre URL non listée et non publique → `401 Unauthorized`.

---

## Endpoints exposés directement par la gateway

| Verb | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login Keycloak (proxy direct vers `/protocol/openid-connect/token`) |
| `POST` | `/api/auth/signup` | Création de compte via Keycloak Admin API |
| `POST` | `/api/auth/forgot-password` | Reset password (Keycloak `execute-actions-email`) |
| `GET` | `/actuator/health` | Health check k8s |

Voir `controller/AuthController.java` et `controller/UserController.java`.

---

## Sécurité — extraction des rôles Keycloak

Spring Security ne lit par défaut que les claims `scope` / `authorities`. Keycloak place ses rôles dans `realm_access.roles`. La gateway injecte un `ReactiveJwtAuthenticationConverter` custom (voir `config/SecurityConfig.java`) qui :

1. Lit `realm_access.roles` du JWT.
2. Préfixe chaque rôle par `ROLE_` pour matcher `hasRole('admin')`.
3. Échoue silencieusement (liste vide) si le claim est absent.

---

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `KEYCLOAK_URL` | `http://keycloak:8080` | Base URL Keycloak (JWKs) |
| `KEYCLOAK_REALM` | `pokemon-drafter` | Realm Keycloak |
| `KEYCLOAK_ADMIN_USERNAME` | `admin` | Compte admin Keycloak (utilisé par signup/forgot) |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Mot de passe admin |
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | Broker Kafka (utilisé par l'appender de logs) |
| `POKEMON_SERVICE_URL`, `COMBAT_SERVICE_URL`, `CHAT_SERVICE_URL`, `LOGS_SERVICE_URL` | URLs internes Docker | Cibles des routes proxy |

Le service écoute sur `8080` à l'intérieur du conteneur, exposé sur `8000` côté hôte.

---

## Lancer en local

Via Docker Compose :

```bash
docker compose up --build gateway-service keycloak
```

Via Gradle (dépendances jointes manuellement) :

```bash
cd APIGatewayService
KEYCLOAK_URL=http://localhost:8080 \
KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
./gradlew bootRun
```

---

## Tests

```bash
cd APIGatewayService
./gradlew test
```
