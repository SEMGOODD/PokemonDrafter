# front-general-service

Frontend général : landing page, login/signup Keycloak, dashboard joueur, **console admin** (logs centralisés).

Stack : Angular 20.3 · TypeScript · Nginx (production) · Node 22 (build).

---

## Routes

| Path | Composant | Garde |
|---|---|---|
| `/auth` | `AuthComponent` (login + signup) | publique |
| `/callback` | `CallbackComponent` (OAuth code → token) | publique |
| `/dashboard` | `DashboardComponent` (accueil joueur) | `authGuard` |
| `/admin/logs` | `AdminLogsComponent` (console admin) | `adminGuard` |

Voir [src/app/app.routes.ts](src/app/app.routes.ts).

---

## Authentification

`AuthService` (`src/app/core/auth/auth.service.ts`) :

- `login(username, password)` — token Keycloak via `password` grant.
- `redirectToKeycloakLogin()` / `redirectToKeycloakRegister()` — redirection OAuth `authorization_code`.
- `handleCallback(code)` — échange code → token.
- `getToken()`, `isLoggedIn()`, `getRoles()`, `isAdmin()`.

Le décodage du JWT (utilisation du claim `realm_access.roles`) est centralisé dans [src/app/core/auth/jwt.util.ts](src/app/core/auth/jwt.util.ts) — partagé entre `AuthService`, `DashboardComponent` et le guard admin.

---

## Console admin

Route `/admin/logs`. Affiche les logs centralisés agrégés par `logs-service` :

- Filtre par service (dropdown alimenté par `GET /api/logs/services`).
- Filtre par niveau (`DEBUG`/`INFO`/`WARN`/`ERROR`).
- Recherche texte sur le message (debounced 300 ms).
- Polling automatique toutes les 5 s.
- Badge coloré par niveau (rouge/jaune/bleu/gris).

Le composant `AdminLogsComponent` ([src/app/features/admin/admin-logs/](src/app/features/admin/admin-logs/)) consomme `LogsApiService` qui appelle la gateway. La gateway revérifie le rôle `admin` côté serveur — le `adminGuard` ne sert qu'à masquer l'UI.

Un lien "Console admin — logs" apparaît dans le dashboard si et seulement si le JWT contient `admin` dans `realm_access.roles`.

---

## Variables d'environnement (runtime)

Injectées dans `window.__env__` à l'exécution Nginx via `docker-entrypoint.sh` qui produit `assets/env.js` à partir des variables Docker.

| Variable | Exemple | Rôle |
|---|---|---|
| `GATEWAY_URL` | `http://localhost:8000` | API Gateway |
| `KEYCLOAK_URL` | `http://localhost:8080` | Endpoint OAuth |
| `KEYCLOAK_REALM` | `pokemon-drafter` | Realm |
| `KEYCLOAK_CLIENT_ID` | `frontend-client` | Client public |
| `FRONT_RED_URL` | `http://localhost:4201` | Frontend Rouge (CTA dashboard) |
| `FRONT_BLUE_URL` | `http://localhost:4202` | Frontend Bleu |

---

## Lancer en local

Via Docker Compose :

```bash
docker compose up --build front-general-service gateway-service keycloak
```

Puis `http://localhost:4200/`.

Via Angular CLI directement :

```bash
cd FrontGeneralService
npm install
ng serve
```

`ng serve` n'injecte pas `window.__env__` — il faut un `assets/env.js` local qui pointe vers les services.

---

## Tests

```bash
cd FrontGeneralService
ng test
```
