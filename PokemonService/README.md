# pokemon-service

Point d'entrée unique vers [PokeAPI](https://pokeapi.co/) pour l'ensemble de l'application. Sert les données Pokémon (fiche, recherche, types) avec un cache Redis pour limiter le trafic vers PokeAPI.

Stack : Spring Boot 4.0.2 · Java 21 · Jackson 3 · Redis 7 · Gradle.

---

## Endpoints

Base URL en local : `http://localhost:8003` (port hôte) ou `http://pokemon-service:8000` (depuis un autre conteneur du réseau Docker).

### `GET /pokemon/{id}`

Fiche complète d'un Pokémon par id numérique.

```bash
curl http://localhost:8003/pokemon/25
```

Réponse :

```json
{
  "id": 25,
  "name": "pikachu",
  "types": ["electric"],
  "height": 4,
  "weight": 60,
  "stats": {
    "hp": 35,
    "attack": 55,
    "defense": 40,
    "specialAttack": 50,
    "specialDefense": 50,
    "speed": 90
  },
  "description": "When several of these POKeMON gather, their electricity could build and cause lightning storms.",
  "habitat": "forest",
  "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
}
```

Pour les formes alternatives (Mega, Gigantamax, variants régionaux), `description` et `habitat` proviennent de l'espèce de base. Exemple : Charizard-Mega-Y (id 10035) hérite de la description de Charizard (species id 6).

### `GET /pokemon/{id}/types`

Réponse légère ne renvoyant que les types — pour les services qui n'ont besoin que de cette info (combat, recommandation).

```bash
curl http://localhost:8003/pokemon/25/types
# {"types":["electric"]}
```

### `GET /pokemon/search`

Recherche paginée par nom et/ou type(s).

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `name` | string | - | Recherche exacte par nom (court-circuit, retourne 1 résultat max) |
| `type1` | string | - | Filtre type 1 (`fire`, `water`, ...) |
| `type2` | string | - | Filtre type 2, combiné en intersection avec `type1` |
| `page` | int | 0 | Numéro de page (0-indexé) |
| `pageSize` | int | 20 | Taille de page, borné `[1, 100]` |

Exemples :

```bash
# Par nom (exact, case-insensitive)
curl 'http://localhost:8003/pokemon/search?name=pikachu'

# Par un type
curl 'http://localhost:8003/pokemon/search?type1=fire&pageSize=5'

# Intersection de deux types
curl 'http://localhost:8003/pokemon/search?type1=fire&type2=flying'
```

Réponse (extrait) :

```json
[
  {
    "id": 6,
    "name": "charizard",
    "types": ["fire", "flying"],
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png"
  },
  {
    "id": 146,
    "name": "moltres",
    "types": ["fire", "flying"],
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/146.png"
  }
]
```

Renvoie une liste vide si aucun filtre n'est fourni.

### `GET /types/effectiveness`

Matrice 18×18 des multiplicateurs de dégâts entre types.

```bash
curl http://localhost:8003/types/effectiveness
```

Réponse (extrait) :

```json
{
  "fire": {
    "water": 0.5,
    "grass": 2.0,
    "fire": 0.5,
    "...": "..."
  },
  "water": {
    "fire": 2.0,
    "...": "..."
  }
}
```

Lecture : `matrice[attaquant][défenseur] = multiplicateur`. Valeurs possibles : `2.0` (super efficace), `1.0` (neutre), `0.5` (peu efficace), `0.0` (sans effet).

Utilisé par `combat-service` pour calculer l'avantage selon la formule du cahier des charges.

---

## Stratégie de cache

Pattern **cache-aside** (lazy) sur Redis. Le premier appel paie le coût d'un fetch PokeAPI, les suivants sont servis directement depuis Redis.

| Clé Redis | Contenu | TTL |
|---|---|---|
| `pokemon:{id}` | JSON `Pokemon` complet | 7 jours |
| `pokemon:name:{name}` | id (string) — index de résolution | 7 jours |
| `species:{id}` | JSON `Species` (description + habitat) — partagé entre toutes les variants d'un même Pokémon de base | 7 jours |
| `type:{name}:pokemon` | Liste d'ids du type | 7 jours |
| `types:effectiveness` | Matrice complète | 30 jours |

**Pourquoi un cache `species:` séparé** : Charizard, Charizard-Mega-X, Charizard-Mega-Y et Charizard-Gmax pointent tous vers la même species id 6. Une seule entrée Redis sert les 4 variants — un seul appel à `/pokemon-species/6` est nécessaire.

**Compatible scaling** : Redis étant externe au service, plusieurs replicas Kubernetes du `pokemon-service` partagent le même cache. Pas de duplication d'appels PokeAPI entre instances.

Inspecter le cache :

```bash
docker exec redis-cache redis-cli KEYS 'pokemon:*'
docker exec redis-cache redis-cli GET pokemon:25
docker exec redis-cache redis-cli TTL pokemon:25      # secondes restantes
```

---

## Configuration

Variables d'environnement (déjà fournies par `docker-compose.yml` et `k8s/manifest.yml`) :

| Variable | Exemple | Rôle |
|---|---|---|
| `REDIS_URL` | `redis://redis-cache:6379` | URL du serveur Redis |
| `POKEAPI_BASE_URL` | `https://pokeapi.co/api/v2` | Base URL PokeAPI |

Le service écoute sur le port `8000` à l'intérieur du conteneur, mappé sur `8003` côté hôte par Docker Compose.

---

## Lancer en local

Via Docker Compose (recommandé) :

```bash
docker compose up --build pokemon-service redis
```

Via Gradle directement (nécessite Redis joignable et un JDK 21 installé) :

```bash
cd PokemonService
REDIS_URL=redis://localhost:6379 POKEAPI_BASE_URL=https://pokeapi.co/api/v2 ./gradlew bootRun
```

---

## Tests

```bash
cd PokemonService
./gradlew test
```

17 tests unitaires couvrant le mapper PokeAPI, la logique de recherche (intersection, pagination, recherche par nom) et l'orchestration du cache-aside.

---

## Architecture interne

```
HTTP request
    │
    ▼
Controller       (/pokemon/{id}, /pokemon/search, /types/effectiveness)
    │
    ▼
Service          (logique metier, orchestration cache-aside)
    │
    ├── Cache Repository  ──→  Redis (StringRedisTemplate + ObjectMapper)
    │
    └── PokeApiClient + PokeApiMapper  ──→  PokeAPI (RestClient)
```

Une responsabilité par fichier. Voir [src/main/java/com/example/pokemon/](src/main/java/com/example/pokemon/) pour le détail.
