# chat-service

Real-time per-duel chat built with **Python + FastAPI + WebSockets + Kafka**.

---

## Responsibilities

| What | How |
|---|---|
| Real-time message delivery | WebSocket, one room per `combat_id` |
| Persistence handoff | Publishes every message to Kafka `chat` topic |
| Auth | Keycloak access token in the first frame; colour resolved from combat-service |

---

## WebSocket endpoint

```
ws://localhost:8006/api/chat/{combat_id}          (Docker Compose)
ws://api.pokemon-drafter.local/api/chat/{combat_id} (Kubernetes, Ingress → chat-service)
```

Browsers cannot send an `Authorization` header on a WebSocket, so the fronts connect to chat-service directly, not through the gateway.

### Authentication (first frame)

The first frame must carry the player's Keycloak access token. Nothing goes in the URL, so the token never lands in access logs.

```json
{ "type": "auth", "token": "<keycloak access token>" }
```

chat-service then ([app/auth.py](app/auth.py)):

1. checks the token signature and expiry against Keycloak's public keys (`/realms/{realm}/protocol/openid-connect/certs`);
2. takes the pseudo from the `preferred_username` claim;
3. calls `GET {COMBAT_SERVICE_URL}/combat/battle/{combat_id}` with the same token: combat-service answers 403 to non-participants, and the response says whether the player is Red or Blue.

Any failure, or no auth frame within 10 s, closes the socket with code `1008` (policy violation).

### Client → Server message

```json
{ "message": "good luck!" }
```

### Server → Client message (chat)

```json
{
  "type": "chat",
  "sender": "red_player1",
  "color": "red",
  "message": "good luck!",
  "combat_id": "abc123"
}
```

### Server → Client message (system)

```json
{
  "type": "system",
  "message": "Connected to combat room abc123",
  "combat_id": "abc123"
}
```

---

## Kafka — topic `chat`

Chaque message envoyé par un joueur est publié sur le topic `chat`.

```json
{
  "combat_id": "abc123",
  "sender":    "red_player1",
  "color":     "red",
  "message":   "good luck!",
  "timestamp": "2026-04-21T10:00:00Z"
}
```

## Kafka — topic `logs-service`

Les évènements applicatifs (connexion/déconnexion WebSocket, erreurs) sont publiés via `KafkaProducerClient.publish_log` sur le topic centralisé `logs-service` consommé par `logs-service`. Mêmes champs que l'appender Logback Java (`service`, `level`, `timestamp`, `message`, `context`) — un format unique côté consommateur.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | Kafka broker address |
| `KEYCLOAK_URL` | `http://keycloak:8080` | In-cluster Keycloak, used to fetch the token signing keys |
| `KEYCLOAK_REALM` | `pokemon-drafter` | Realm whose keys sign the tokens |
| `COMBAT_SERVICE_URL` | `http://combat-service:8000` | Used to resolve the player's colour in the battle |

---

## Running locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

---

## docker-compose snippet

```yaml
chat-service:
  build: ./ChatService
  container_name: chat-service
  ports:
    - "8006:8000"
  depends_on:
    kafka:
      condition: service_healthy
  environment:
    KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    KEYCLOAK_URL: http://keycloak:8080
    COMBAT_SERVICE_URL: http://combat-service:8000
  networks:
    - pokemon-net
```