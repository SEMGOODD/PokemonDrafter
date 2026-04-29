# chat-service

Real-time per-duel chat built with **Python + FastAPI + WebSockets + Kafka**.

---

## Responsibilities

| What | How |
|---|---|
| Real-time message delivery | WebSocket, one room per `combat_id` |
| Persistence handoff | Publishes every message to Kafka `chat` topic |
| Auth | Trusts `X-User-Id` / `X-User-Color` headers injected by the API Gateway |

---

## WebSocket endpoint

```
ws://localhost:8000/api/chat/{combat_id}
```

The gateway proxies this as:

```
ws://localhost:8000/api/chat/{combat_id}   →   ws://chat-service:8000/api/chat/{combat_id}
```

### Required headers (injected by gateway)

| Header | Example |
|---|---|
| `X-User-Id` | `red_player1` |
| `X-User-Color` | `red` or `blue` |

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

---

## Running locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

---

## Gateway changes required

### 1. `application.yml` — add chat route

```yaml
- id: chat-route
  uri: ${CHAT_SERVICE_URL:http://chat-service:8000}
  predicates:
    - Path=/api/chat/**
```

### 2. New filter — `UserHeaderInjectionFilter.java`

Drop `UserHeaderInjectionFilter.java` into `com.example.Gateway.filter`.  
It reads `preferred_username` and `realm_access.roles` from the validated JWT  
and injects `X-User-Id` and `X-User-Color` headers for all downstream services.

---

## docker-compose snippet

```yaml
chat-service:
  build: ./ChatService
  container_name: chat-service
  ports:
    - "8006:8000"
  depends_on:
    - kafka
  environment:
    KAFKA_BOOTSTRAP_SERVERS: kafka:9092
  networks:
    - pokemon-net
```