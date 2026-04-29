import asyncio
import json
import logging
import os
from datetime import datetime, timezone

from aiokafka import AIOKafkaProducer

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
CHAT_TOPIC = "chat"
LOGS_TOPIC = "logs-service"
SERVICE_NAME = "chat-service"


class KafkaProducerClient:
    """
    Async Kafka producer.

    Message schema published to the 'chat' topic:
    {
        "combat_id": "abc123",
        "sender":    "red_player1",
        "color":     "red",
        "message":   "good luck!",
        "timestamp": "2026-04-21T10:00:00Z"
    }
    """

    def __init__(self):
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        self._producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            request_timeout_ms=10_000,
            retry_backoff_ms=500,
        )
        for attempt in range(1, 11):
            try:
                await self._producer.start()
                logger.info(f"Kafka producer connected to {KAFKA_BOOTSTRAP_SERVERS}")
                return
            except Exception as e:
                logger.warning(f"Kafka not ready (attempt {attempt}/10): {e}")
                await asyncio.sleep(3)
        logger.error("Could not connect to Kafka after 10 attempts — messages will be dropped")

    async def stop(self) -> None:
        if self._producer:
            await self._producer.stop()

    async def publish_chat(
        self,
        combat_id: str,
        sender: str,
        color: str,
        message: str,
    ) -> None:
        if self._producer is None:
            logger.error("Kafka producer not started — message not published")
            return

        record = {
            "combat_id": combat_id,
            "sender": sender,
            "color": color,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            await self._producer.send_and_wait(CHAT_TOPIC, value=record)
            logger.debug(f"[{combat_id}] Kafka ← {record}")
        except Exception as e:
            logger.error(f"[{combat_id}] Failed to publish to Kafka: {e}")

    async def publish_log(
        self,
        level: str,
        message: str,
        context: dict | None = None,
    ) -> None:
        """
        Publie un log applicatif sur le topic centralisé. Mêmes champs que
        l'appender Logback Java (service, level, timestamp, message, context)
        afin que le LogsService consomme un format unique.
        """
        if self._producer is None:
            return

        record = {
            "service": SERVICE_NAME,
            "level": level.upper(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message,
            "context": context or {},
        }

        try:
            await self._producer.send_and_wait(LOGS_TOPIC, value=record)
        except Exception as e:
            logger.warning(f"Failed to publish log to Kafka: {e}")