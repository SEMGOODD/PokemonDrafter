# logs-service

Collecte centralisée des logs applicatifs. Consomme un topic Kafka, persiste les événements en PostgreSQL (`admin_db`), et expose une API REST pour la console admin du frontend.

Stack : Spring Boot 4.0.2 · Java 21 · Spring Kafka · Spring Data JPA · PostgreSQL · Gradle.

---

## Flux de données

```
Java backends (Gateway, Pokemon, Combat) ──┐
   via KafkaLogbackAppender                │
                                           ├─→ Kafka topic "logs-service" ─→ logs-service ─→ admin_db.log_entries
ChatService Python                         │                                       │
   via KafkaProducerClient.publish_log     │                                       │
                                           │                                       ▼
CombatService BattleEventProducer ─────────┘                              GET /logs (gateway, admin only)
   (BATTLE_STARTED / BATTLE_ENDED)                                                 │
                                                                                   ▼
                                                                       Frontend admin console (/admin/logs)
```

Le consumer est tolérant : il accepte deux formats sur le même topic.

**Format complet** (appender Logback Java + Python `publish_log`) :

```json
{
  "service": "combat-service",
  "level": "INFO",
  "timestamp": "2026-04-29T15:32:01Z",
  "message": "Battle started",
  "context": { "battleId": "...", "logger": "...", "thread": "..." }
}
```

**Format minimaliste historique** (`BattleEventProducer`) :

```json
{ "eventType": "BATTLE_STARTED", "battleId": "abc-123" }
```

Champs manquants → défauts (`service: unknown`, `level: INFO`, `timestamp: now`). La payload brute est toujours stockée dans `context` afin que les requêtes futures puissent la consulter sans migration.

---

## Endpoints exposés

Base URL en local : `http://localhost:8007` ou `http://logs-service:8000` depuis un autre conteneur. Via gateway : `http://localhost:8000/api/logs/**` (rôle `admin` requis).

| Verb | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/logs` | JWT + admin | Liste paginée des logs, filtres `service`, `level`, `q` (texte), `limit` |
| `GET` | `/logs/services` | JWT + admin | Liste distincte des services qui ont émis des logs (alimente le dropdown front) |
| `GET` | `/actuator/health` | Public | Health check |

Exemple :

```bash
TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/pokemon-drafter/protocol/openid-connect/token' \
  -d 'grant_type=password&client_id=frontend-client&username=admin&password=admin' | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8000/api/logs?service=combat-service&level=INFO&limit=50'
```

---

## Modèle de données

Table `log_entries` (auto-créée par Hibernate `ddl-auto: update`) :

| Colonne | Type | Description |
|---|---|---|
| `id` | BIGSERIAL PK | Identifiant interne |
| `service` | VARCHAR(64) | Nom du service émetteur |
| `level` | VARCHAR(16) | `DEBUG` / `INFO` / `WARN` / `ERROR` |
| `timestamp` | TIMESTAMP | Date d'émission |
| `message` | TEXT | Message log |
| `context` | TEXT | Payload Kafka brute (JSON) |

Index sur `service`, `level`, `timestamp` pour les filtres.

---

## Sécurité

`SecurityConfig.java` exige JWT valide + autorité `ROLE_admin` sur `/logs/**`. La gateway revérifie déjà le rôle ; cette validation interne est de la défense en profondeur (un service compromis qui sauterait la gateway ne pourrait pas lire les logs).

Le converter custom lit `realm_access.roles` Keycloak et préfixe chaque rôle par `ROLE_`.

---

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://postgres-db:5432/admin_db` | URL JDBC PostgreSQL |
| `DATABASE_USER` | `admin` | Utilisateur PostgreSQL |
| `DATABASE_PASSWORD` | `1234` | Mot de passe PostgreSQL |
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | Broker Kafka |
| `KEYCLOAK_URL` | `http://keycloak:8080` | Base URL Keycloak (JWKs) |

Le service écoute sur le port `8000`, mappé sur `8007` côté hôte (Docker Compose).

---

## Extension future

Le code est conçu pour évoluer sans refactoring lourd :

- **Nouveaux topics** (`logs-chat`, ...) → ajouter dans `application.yml > logs.topics.primary` (le `@KafkaListener` accepte une liste séparée par virgules).
- **Nouveaux filtres** (`dateFrom`, `userId`, ...) → ajouter dans `LogQueryFilter` et `LogEntrySpecifications#fromFilter`.
- **Pagination cursor** → étendre `LogQueryService#search` avec `offset` ou `lastSeenId`.
- **Export CSV** → ajouter `GET /logs/export` ré-utilisant `LogQueryService`.

---

## Lancer en local

```bash
docker compose up --build logs-service postgres kafka keycloak
```

Via Gradle (dépendances jointes) :

```bash
cd LogsService
DATABASE_URL=jdbc:postgresql://localhost:5432/admin_db \
DATABASE_USER=admin DATABASE_PASSWORD=1234 \
KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
KEYCLOAK_URL=http://localhost:8080 \
./gradlew bootRun
```

---

## Tests

```bash
cd LogsService
./gradlew test
```

`LogIngestServiceTest` couvre les deux formats (riche + héritage) et le rejet d'un JSON malformé.
