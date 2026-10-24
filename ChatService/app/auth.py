import asyncio
import logging
import os
from dataclasses import dataclass
from urllib.parse import quote

import httpx
import jwt

logger = logging.getLogger(__name__)

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "pokemon-drafter")
COMBAT_SERVICE_URL = os.getenv("COMBAT_SERVICE_URL", "http://combat-service:8000")

JWKS_URL = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
SIGNING_ALGORITHMS = ["RS256"]
USERNAME_CLAIM = "preferred_username"
COMBAT_LOOKUP_TIMEOUT_SECONDS = 5.0
HTTP_OK = 200

_jwks_client = jwt.PyJWKClient(JWKS_URL)


class ChatAuthError(Exception):
    """Raised when a WebSocket client cannot join a combat room."""


@dataclass(frozen=True)
class ChatIdentity:
    user_id: str
    color: str


async def authenticate(token: str, combat_id: str) -> ChatIdentity:
    """
    Resolves who is connecting from their Keycloak access token, and which side
    they play in this combat from combat-service. Nothing is taken from the client.
    """
    user_id = await asyncio.to_thread(_verify_token, token)
    color = await _resolve_color(token, combat_id, user_id)
    return ChatIdentity(user_id=user_id, color=color)


def _verify_token(token: str) -> str:
    # Signature and expiry only, like the Java services: the issuer is the
    # browser-facing Keycloak URL, which differs from the in-cluster one.
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=SIGNING_ALGORITHMS,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as e:
        raise ChatAuthError(f"invalid token: {e}") from e

    user_id = claims.get(USERNAME_CLAIM)
    if not user_id:
        raise ChatAuthError(f"token has no {USERNAME_CLAIM} claim")
    return user_id


async def _resolve_color(token: str, combat_id: str, user_id: str) -> str:
    # combat-service answers 403 to anyone who is not a participant of the battle.
    url = f"{COMBAT_SERVICE_URL}/combat/battle/{quote(combat_id, safe='')}"
    try:
        async with httpx.AsyncClient(timeout=COMBAT_LOOKUP_TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
    except httpx.HTTPError as e:
        raise ChatAuthError(f"combat-service unreachable: {e}") from e

    if response.status_code != HTTP_OK:
        raise ChatAuthError(f"combat-service refused battle lookup ({response.status_code})")

    battle = response.json()
    if battle.get("redPlayerId") == user_id:
        return "red"
    if battle.get("bluePlayerId") == user_id:
        return "blue"
    raise ChatAuthError(f"{user_id} is not a participant of this battle")
