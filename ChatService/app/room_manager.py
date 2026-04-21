import logging
from dataclasses import dataclass, field
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

OPPONENT = {"red": "blue", "blue": "red"}


@dataclass
class CombatRoom:
    combat_id: str
    red: Optional[WebSocket] = field(default=None)
    blue: Optional[WebSocket] = field(default=None)

    def get_socket(self, color: str) -> Optional[WebSocket]:
        return self.red if color == "red" else self.blue

    def set_socket(self, color: str, ws: Optional[WebSocket]) -> None:
        if color == "red":
            self.red = ws
        else:
            self.blue = ws

    def is_empty(self) -> bool:
        return self.red is None and self.blue is None


class RoomManager:
    """
    Manages per-duel WebSocket rooms.

    Structure:
        rooms: { combat_id -> CombatRoom }

    Each room holds at most one connection per color (red / blue).
    If the same color reconnects, the old socket is replaced.
    """

    def __init__(self):
        self._rooms: dict[str, CombatRoom] = {}

    def _get_or_create_room(self, combat_id: str) -> CombatRoom:
        if combat_id not in self._rooms:
            self._rooms[combat_id] = CombatRoom(combat_id=combat_id)
        return self._rooms[combat_id]

    async def connect(self, combat_id: str, color: str, websocket: WebSocket) -> None:
        room = self._get_or_create_room(combat_id)

        # Close stale connection for this color if any
        old_ws = room.get_socket(color)
        if old_ws is not None:
            try:
                await old_ws.close()
            except Exception:
                pass
            logger.warning(f"[{combat_id}] Replaced stale {color} connection")

        room.set_socket(color, websocket)
        logger.info(f"[{combat_id}] Room state — red: {'✓' if room.red else '✗'} | blue: {'✓' if room.blue else '✗'}")

    async def disconnect(self, combat_id: str, color: str) -> None:
        room = self._rooms.get(combat_id)
        if room is None:
            return

        room.set_socket(color, None)

        if room.is_empty():
            del self._rooms[combat_id]
            logger.info(f"[{combat_id}] Room closed (both players gone)")

    async def send_to_opponent(self, combat_id: str, sender_color: str, payload: dict) -> None:
        """Forward a message to the player of the opposite color."""
        room = self._rooms.get(combat_id)
        if room is None:
            return

        opponent_color = OPPONENT[sender_color]
        opponent_ws = room.get_socket(opponent_color)

        if opponent_ws is None:
            logger.debug(f"[{combat_id}] Opponent ({opponent_color}) not connected — message dropped")
            return

        try:
            await opponent_ws.send_json(payload)
        except Exception as e:
            logger.warning(f"[{combat_id}] Failed to send to {opponent_color}: {e}")
            room.set_socket(opponent_color, None)

    def room_count(self) -> int:
        return len(self._rooms)