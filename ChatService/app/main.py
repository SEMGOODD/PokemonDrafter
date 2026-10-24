import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.auth import ChatAuthError, ChatIdentity, authenticate
from app.kafka_producer import KafkaProducerClient
from app.kafka_consumer import KafkaChatConsumer
from app.room_manager import RoomManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AUTH_FRAME_TYPE = "auth"
AUTH_TIMEOUT_SECONDS = 10

room_manager = RoomManager()
kafka_producer = KafkaProducerClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global kafka_consumer

    await kafka_producer.start()
    logger.info("Kafka producer started")

    kafka_consumer = KafkaChatConsumer(room_manager)
    await kafka_consumer.start()
    logger.info("Kafka consumer started")

    yield

    if kafka_consumer:
        await kafka_consumer.stop()
    await kafka_producer.stop()
    logger.info("Kafka producer and consumer stopped")


app = FastAPI(
    title="Chat Service",
    description="Per-duel real-time chat via WebSockets + Kafka",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return JSONResponse({"status": "UP"})


async def receive_identity(websocket: WebSocket, combat_id: str) -> ChatIdentity:
    # Browsers cannot set headers on a WebSocket, so the token comes in the first
    # frame rather than the URL, which would leak it into access logs.
    raw = await asyncio.wait_for(websocket.receive_text(), AUTH_TIMEOUT_SECONDS)
    try:
        frame = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ChatAuthError("first frame is not JSON") from e

    if not isinstance(frame, dict) or frame.get("type") != AUTH_FRAME_TYPE:
        raise ChatAuthError("first frame must be an auth frame")
    token = frame.get("token")
    if not isinstance(token, str) or not token:
        raise ChatAuthError("auth frame has no token")
    return await authenticate(token, combat_id)


@app.websocket("/api/chat/{combat_id}")
async def websocket_chat(websocket: WebSocket, combat_id: str):
    await websocket.accept()
    try:
        identity = await receive_identity(websocket, combat_id)
    except WebSocketDisconnect:
        return
    except (ChatAuthError, asyncio.TimeoutError) as e:
        logger.warning(f"[{combat_id}] WebSocket rejected — {str(e) or 'no auth frame in time'}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = identity.user_id
    user_color = identity.color
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