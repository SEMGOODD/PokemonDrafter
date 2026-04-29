# front-color-service

Frontend des espaces de jeu Rouge et Bleu. **Une seule codebase**, deux containers Docker (`front-red-service`, `front-blue-service`) paramétrés au runtime par la variable `COLOR=red|blue`.

Stack : Angular 21.2 · TypeScript · Nginx · Node 22.

---

## Pourquoi un seul codebase

Le PDF impose un front différent par couleur. En pratique le code est identique : seul change le thème (rouge vs bleu) et l'URL backend de référence. Plutôt que de dupliquer le code et créer deux dérives possibles, le projet s'appuie sur :

- Une variable d'environnement `COLOR` injectée par Docker.
- Un `ThemeService` qui adapte couleurs, animations, et asset Pokéball à la valeur courante.
- Deux services Docker construits à partir du même Dockerfile.

---

## Features

| Path | Composant |
|---|---|
| `/home` | Page d'accueil de l'espace joueur |
| `/pokedex/search` | Recherche Pokémon (PokeAPI proxy) |
| `/pokedex/:id` | Fiche détail |
| `/combat` | Liste / création / déroulement d'un duel |

Voir [src/app/app.routes.ts](src/app/app.routes.ts) et [src/app/features/](src/app/features/).

---

## Système de thème

Service réactif à `src/app/core/theme/theme.service.ts`.

| Thème | Déclencheur | Visuel |
|---|---|---|
| `neutral` | Non authentifié (peu importe `COLOR`) | Liseré rouge fin + Honor Ball |
| `red` | Authentifié, `COLOR=red` | Bandeau rouge + séparateur noir + Poké Ball |
| `blue` | Authentifié, `COLOR=blue` | Bandeau bleu + séparateur noir + Super Ball |
| `love` | Easter egg : 5 clics sur la pokéball en moins de 2 s | Bandeau rose + Love Ball (toggle) |

API publique :

```ts
readonly theme: Signal<Theme>
readonly pokeballVariant: Signal<PokeballVariant>
readonly isAuthenticated: Signal<boolean>

setAuthenticated(value: boolean): void
registerPokeballClick(): void
```

Toute transition de thème (login, logout, easter egg) est animée via `document.startViewTransition` + un keyframe `pokeball-reveal` dans `src/styles.css`. Firefox utilise un cross-fade par défaut.

---

## Hook auth

L'intégration Keycloak doit toujours passer par :

```ts
themeService.setAuthenticated(true);   // login → red/blue
themeService.setAuthenticated(false);  // logout → neutral
```

Ne jamais muter `data-theme` ou `COLOR` à la main : l'animation circle-reveal ne se jouera pas.

---

## Ajouter un nouveau thème

1. Étendre l'union `Theme` dans `src/app/core/theme/theme.types.ts`.
2. Ajouter un bloc `[data-theme="<name>"]` dans `src/styles.css` qui surcharge `--theme-color` et `--separator-color`.
3. Optionnel : ajouter `public/assets/ui/<name>ball.png` et mettre à jour `POKEBALL_ASSETS` dans le composant pokeball-button.
4. Mettre à jour le computed `theme` dans `ThemeService`.

---

## Variables d'environnement (runtime)

Injectées dans `window.__env__` au démarrage Nginx (voir `docker-entrypoint.sh`).

| Variable | Exemple | Rôle |
|---|---|---|
| `COLOR` | `red` ou `blue` | Détermine le thème authentifié |
| `GATEWAY_URL` | `http://localhost:8000` | API Gateway |
| `KEYCLOAK_URL` | `http://localhost:8080` | OAuth |
| `KEYCLOAK_REALM` | `pokemon-drafter` | Realm |
| `KEYCLOAK_CLIENT_ID` | `frontend-client` | Client public |
| `FRONT_GENERAL_URL` | `http://localhost:4200` | Front général (retour login) |
| `CHAT_WS_URL` | `ws://localhost:8006` | WebSocket chat (sinon dérive de `GATEWAY_URL`) |

---

## Lancer en local

Via Docker Compose (les deux variantes) :

```bash
docker compose up --build front-red-service front-blue-service gateway-service
```

Front rouge : `http://localhost:4201` · Front bleu : `http://localhost:4202`.

Via Angular CLI (une couleur à la fois) :

```bash
cd FrontColorService
npm install
ng serve   # ouvre sur :4200
```

`ng serve` n'utilise pas `docker-entrypoint.sh` — fournir manuellement `assets/env.js`.

---

## Tests

```bash
cd FrontColorService
ng test
```
