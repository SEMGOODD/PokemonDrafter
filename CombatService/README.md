# combat-service

Pokemon duel simulation service. Handles three game modes (Draft, Built, Random), turn-by-turn gameplay, and combat resolution using the type advantage formula. Battle history is persisted in PostgreSQL.

Stack: Spring Boot 4.0.2 · Java 21 · Spring Kafka · Spring Data JPA · PostgreSQL · Gradle.

---

## Endpoints

Local base URL: `http://localhost:8005` (host port) or `http://combat-service:8000` (from another Docker container).
Via gateway: `http://localhost:8000/api/combat/**`

All endpoints require a valid Keycloak JWT token (`Authorization: Bearer <token>`).

---

### `POST /combat/battle`

Creates and starts a new battle.

**DRAFT mode** — Players pick their team from 12 randomly selected Pokemon. Battle enters `DRAFT_PHASE`. Use `/draft` to submit picks.

```bash
curl -X POST http://localhost:8005/combat/battle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"redPlayerId": "player-red-1", "bluePlayerId": "player-blue-1", "mode": "DRAFT"}'
```

**BUILT mode** — Each player provides their team (Pokemon IDs). Battle starts immediately in `IN_PROGRESS`.

```bash
curl -X POST http://localhost:8005/combat/battle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "redPlayerId": "player-red-1",
    "bluePlayerId": "player-blue-1",
    "mode": "BUILT",
    "redTeam": [6, 25, 39, 94, 131, 143],
    "blueTeam": [9, 76, 112, 130, 149, 151]
  }'
```

**RANDOM mode** — Two teams of 6 Pokemon generated randomly. The first active Pokemon for each player is also chosen at random.

```bash
curl -X POST http://localhost:8005/combat/battle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"redPlayerId": "player-red-1", "bluePlayerId": "player-blue-1", "mode": "RANDOM"}'
```

Response (excerpt):

```json
{
  "battleId": "a1b2c3d4-...",
  "mode": "BUILT",
  "status": "IN_PROGRESS",
  "redPlayerId": "player-red-1",
  "bluePlayerId": "player-blue-1",
  "redTeam": [...],
  "blueTeam": [...],
  "turnNumber": 1,
  "turnDeadline": "2025-01-01T12:01:30Z"
}
```

---

### `GET /combat/battle/{battleId}`

Returns the full state of a battle. Returns `403` if the authenticated player is not a participant.

```bash
curl http://localhost:8005/combat/battle/a1b2c3d4-... \
  -H "Authorization: Bearer <token>"
```

Key response fields:

| Field | Description |
|---|---|
| `battleId` | Unique identifier |
| `mode` | `DRAFT`, `BUILT` or `RANDOM` |
| `status` | `DRAFT_PHASE`, `IN_PROGRESS` or `FINISHED` |
| `redPlayerId` / `bluePlayerId` | Player IDs |
| `redTeam` / `blueTeam` | Pokemon list with their state (`ko: true/false`) |
| `draftPool` | Pokemon available to pick (DRAFT mode only) |
| `redActivePokemon` / `blueActivePokemon` | Currently active Pokemon |
| `turnNumber` | Current turn number |
| `turnDeadline` | Turn time limit (ISO 8601) |
| `turnHistory` | History of all resolved turns |
| `winnerId` | Winner's player ID (set when `status = FINISHED`) |

---

### `GET /combat/battles/mine`

Returns all **finished** battles in which the authenticated player participated. Data is loaded from PostgreSQL — persists across service restarts.

```bash
curl http://localhost:8005/combat/battles/mine \
  -H "Authorization: Bearer <token>"
```

---

### `GET /combat/battle/{battleId}/turns`

Returns the full turn-by-turn history of a battle. Returns `403` if the authenticated player is not a participant.

```bash
curl http://localhost:8005/combat/battle/a1b2c3d4-.../turns \
  -H "Authorization: Bearer <token>"
```

Response:

```json
[
  {
    "turnNumber": 1,
    "redActionType": "SWITCH",
    "blueActionType": "STAY",
    "redPokemonName": "Pikachu",
    "bluePokemonName": "Carapuce",
    "redScore": 1.0,
    "blueScore": 2.0,
    "winnerId": "player-blue-1",
    "redKo": true,
    "blueKo": false
  },
  ...
]
```

---

### `GET /combat/battle/{battleId}/turns/{turnNumber}`

Returns the details of a specific turn. Returns `403` if the authenticated player is not a participant, `400` if the turn does not exist.

```bash
curl http://localhost:8005/combat/battle/a1b2c3d4-.../turns/3 \
  -H "Authorization: Bearer <token>"
```

Turn result fields:

| Field | Description |
|---|---|
| `turnNumber` | Turn index (starts at 1) |
| `redActionType` | `SWITCH` or `STAY` (Red player's action) |
| `blueActionType` | `SWITCH` or `STAY` (Blue player's action) |
| `redPokemonName` | Red's active Pokemon name |
| `bluePokemonName` | Blue's active Pokemon name |
| `redScore` | F(Red) type advantage score |
| `blueScore` | F(Blue) type advantage score |
| `winnerId` | Player ID who won the turn (`null` if draw) |
| `redKo` | Whether Red's Pokemon was KO'd |
| `blueKo` | Whether Blue's Pokemon was KO'd |

---

### `POST /combat/battle/{battleId}/draft`

Submit one or more picks during the Draft phase. Returns `403` if the `playerId` does not match the authenticated user.

**Pick order** (12 Pokemon pool → 6 per player):

| Turn | Player | Picks |
|---|---|---|
| 1 | Red | 1 |
| 2 | Blue | 2 |
| 3 | Red | 1 |
| 4 | Blue | 1 |
| 5 | Red | 1 |
| 6 | Blue | 1 |
| 7 | Red | 1 |
| 8 | Blue | 1 |
| 9 | Red | 1 |
| 10 | Blue | 1 |
| 11 | Red | 1 |

```bash
# Turn 1: Red picks 1 Pokemon
curl -X POST http://localhost:8005/combat/battle/a1b2c3d4-.../draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"playerId": "player-red-1", "pokemonIds": [25]}'

# Turn 2: Blue picks 2 Pokemon simultaneously
curl -X POST http://localhost:8005/combat/battle/a1b2c3d4-.../draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"playerId": "player-blue-1", "pokemonIds": [6, 9]}'
```

When all 12 picks are done, the battle automatically transitions to `IN_PROGRESS`.

---

### `POST /combat/battle/{battleId}/action`

Submit a player's action for the current turn. The turn resolves once both players have acted. Returns `403` if the `playerId` does not match the authenticated user.

**SWITCH** — Send a new Pokemon into play (required if the active Pokemon is KO):

```bash
curl -X POST http://localhost:8005/combat/battle/a1b2c3d4-.../action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"playerId": "player-red-1", "actionType": "SWITCH", "pokemonId": 94}'
```

**STAY** — Keep the current active Pokemon in play:

```bash
curl -X POST http://localhost:8005/combat/battle/a1b2c3d4-.../action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"playerId": "player-red-1", "actionType": "STAY"}'
```

Constraints:
- `STAY` is forbidden if the active Pokemon is KO or absent.
- `SWITCH` requires a valid `pokemonId` that is not KO and belongs to the player's team.
- A player who does not act before the 90-second timer expires loses the match.

---

### `POST /combat/battle/{battleId}/forfeit`

Declare forfeit. The opponent wins immediately. Returns `403` if the `playerId` does not match the authenticated user.

```bash
curl -X POST http://localhost:8005/combat/battle/a1b2c3d4-.../forfeit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"playerId": "player-red-1"}'
```

---

## Combat Resolution Formula

For two Pokemon **A** (types W, X) and **B** (types Y, Z), the type advantage score is:

```
F(A) = 1*(W/Y)*(W/Z) + 1*(X/Y)*(X/Z)
F(B) = 1*(Y/W)*(Y/X) + 1*(Z/W)*(Z/X)
```

where `(T1/T2)` is the damage multiplier of type T1 attacking type T2, from the matrix provided by `pokemon-service`. A blank cell counts as 1.

**Turn resolution:**
- `F(A) > F(B)` → B is KO, Red wins the turn.
- `F(B) > F(A)` → A is KO, Blue wins the turn.
- `F(A) = F(B)` → Both Pokemon are KO (draw turn).

The match ends when all Pokemon on one side are KO. The match winner is published to Kafka so that the Red/Blue backends can update scores (+10 / -10 points).

**Example** — Charizard (Fire/Flying) vs Swampert (Water/Ground):

```
F(Charizard) = 1*(Fire/Water)*(Fire/Ground) + 1*(Flying/Water)*(Flying/Ground)
             = 1*0.5*1 + 1*1*1 = 1.5

F(Swampert)  = 1*(Water/Fire)*(Water/Flying) + 1*(Ground/Fire)*(Ground/Flying)
             = 1*2*1 + 1*2*0 = 2

→ Swampert wins the turn, Charizard is KO.
```

---

## Turn Timer

Each turn has a **90-second** deadline. A scheduled task checks every 5 seconds:

- If only one player has acted and the timer expired → the other player **loses the match**.
- If neither player has acted → the timer is ignored (battle remains suspended).

---

## Persistence

Battle state is persisted in PostgreSQL (`combat_db`) after every state change. The `battles` table stores:

| Column | Type | Description |
|---|---|---|
| `battle_id` | PK | Unique battle identifier |
| `red_player_id` / `blue_player_id` | TEXT | Used to filter by player |
| `mode` / `status` / `winner_id` | TEXT | Queryable metadata |
| `turn_number` | INT | Current turn |
| `battle_data` | TEXT | Full battle state serialized as JSON |
| `created_at` / `updated_at` | TIMESTAMP | Timestamps |

On restart, active battles are reloaded from the database on first access. Past battles retrieved via `GET /battles/mine` are always read directly from the database.

> **First startup:** if the `combat_db` database does not exist yet, run `docker compose down -v && docker compose up --build` to re-execute `init.sql`.

---

## Kafka Events

| Topic | Event type | Trigger |
|---|---|---|
| `battle` | `BATTLE_STARTED` | Battle created |
| `battle` | `TURN_RESOLVED` | Turn resolved (with winner) |
| `battle` | `BATTLE_ENDED` | Match over (with `winnerId`) |
| `battle` | `FORFEIT` | Player forfeited |
| `chat` | bot message | After each turn (summary + turn winner) |
| `logs-service` | log | Battle start and end |

---

## Configuration

Environment variables (provided by `docker-compose.yml`):

| Variable | Example | Role |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | Kafka broker address |
| `POKEMON_SERVICE_URL` | `http://pokemon-service:8000` | Pokemon service URL (types + effectiveness matrix) |
| `KEYCLOAK_URL` | `http://keycloak:8080` | Keycloak base URL for JWT validation |
| `DATABASE_URL` | `jdbc:postgresql://postgres-db:5432/combat_db` | PostgreSQL connection URL |
| `DATABASE_USER` | `admin` | PostgreSQL username |
| `DATABASE_PASSWORD` | `1234` | PostgreSQL password |

---

## Running locally

Via Docker Compose (recommended):

```bash
docker compose up --build combat-service pokemon-service redis kafka postgres
```

Via Gradle directly (requires all dependencies reachable):

```bash
cd CombatService
KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
POKEMON_SERVICE_URL=http://localhost:8003 \
KEYCLOAK_URL=http://localhost:8080 \
DATABASE_URL=jdbc:postgresql://localhost:5432/combat_db \
DATABASE_USER=admin \
DATABASE_PASSWORD=1234 \
./gradlew bootRun
```

---

## Internal Architecture

```
HTTP request
    │
    ▼
BattleController   (POST /combat/battle, GET /battle/{id}, GET /battles/mine,
                    GET /turns, GET /turns/{n}, /draft, /action, /forfeit)
    │
    ▼
BattleService      (ConcurrentHashMap cache + PostgreSQL persistence, @Scheduled timer)
    │
    ├── CombatResolverService  ──→  F formula, turn resolution
    │       │
    │       └── PokemonServiceClient  ──→  GET /types/effectiveness (cached in memory)
    │
    ├── PokemonServiceClient   ──→  GET /pokemon/{id} (types + sprite)
    │
    ├── BattleRepository       ──→  PostgreSQL combat_db.battles
    │
    └── BattleEventProducer    ──→  Kafka (battle · chat · logs-service)
```
