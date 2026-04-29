import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from app.kafka_producer import KafkaProducerClient
from app.room_manager import RoomManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

room_manager = RoomManager()
kafka_producer = KafkaProducerClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await kafka_producer.start()
    logger.info("Kafka producer started")
    yield
    await kafka_producer.stop()
    logger.info("Kafka producer stopped")


app = FastAPI(
    title="Chat Service",
    description="Per-duel real-time chat via WebSockets + Kafka",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return JSONResponse({"status": "UP"})


@app.websocket("/api/chat/{combat_id}")
async def websocket_chat(websocket: WebSocket, combat_id: str):
    user_id = websocket.headers.get("x-user-id") or websocket.query_params.get("userId")
    user_color = websocket.headers.get("x-user-color") or websocket.query_params.get("color")

    if not user_id or not user_color:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning("WebSocket rejected — missing X-User-Id or X-User-Color headers")
        return

    if user_color not in ("red", "blue"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning(f"WebSocket rejected — invalid color '{user_color}' for user '{user_id}'")
        return

    await websocket.accept()
    logger.info(f"[{combat_id}] {user_id} ({user_color}) connected")
    await kafka_producer.publish_log(
        level="INFO",
        message=f"WebSocket connected: {user_id} ({user_color})",
        context={"combat_id": combat_id, "user_id": user_id, "color": user_color},
    )

    try:
        await room_manager.connect(combat_id, user_color, websocket)

        await websocket.send_json({
            "type": "system",
            "message": f"Connected to combat room {combat_id}",
            "combat_id": combat_id,
        })

        while True:
            raw = await websocket.receive_text()

            if not raw or not raw.strip():
                continue

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                logger.debug(f"[{combat_id}] Non-JSON frame from {user_id}, ignoring")
                continue

            message_text = data.get("message", "").strip()
            if not message_text:
                continue

            logger.info(f"[{combat_id}] {user_id}: {message_text}")

            await room_manager.send_to_opponent(
                combat_id=combat_id,
                sender_color=user_color,
                payload={
                    "type": "chat",
                    "sender": user_id,
                    "color": user_color,
                    "message": message_text,
                    "combat_id": combat_id,
                },
            )

            await kafka_producer.publish_chat(
                combat_id=combat_id,
                sender=user_id,
                color=user_color,
                message=message_text,
            )

    except WebSocketDisconnect:
        logger.info(f"[{combat_id}] {user_id} ({user_color}) disconnected")
        await room_manager.disconnect(combat_id, user_color)

        await room_manager.send_to_opponent(
            combat_id=combat_id,
            sender_color=user_color,
            payload={
                "type": "system",
                "message": f"{user_id} left the chat",
                "combat_id": combat_id,
            },
        )

    except Exception as e:
        logger.error(f"[{combat_id}] Unexpected error for {user_id}: {e}")
        await kafka_producer.publish_log(
            level="ERROR",
            message=f"WebSocket error: {e}",
            context={"combat_id": combat_id, "user_id": user_id},
        )
        await room_manager.disconnect(combat_id, user_color)