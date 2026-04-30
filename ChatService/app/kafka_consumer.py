import asyncio
import json
import logging
import os

from aiokafka import AIOKafkaConsumer

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
CHAT_TOPIC = "chat"


class KafkaChatConsumer:
    """
    Consumes bot messages from the 'chat' Kafka topic (published by BattleEventProducer)
    and broadcasts them to the correct WebSocket room.
    """

    def __init__(self, room_manager):
        self._room_manager = room_manager
        self._consumer: AIOKafkaConsumer | None = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            CHAT_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id="chat-service-consumer",
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            auto_offset_reset="latest",
        )
        for attempt in range(1, 11):
            try:
                await self._consumer.start()
                logger.info(f"Kafka consumer connected to {KAFKA_BOOTSTRAP_SERVERS}")
                self._task = asyncio.create_task(self._consume())
                return
            except Exception as e:
                logger.warning(f"Kafka consumer not ready (attempt {attempt}/10): {e}")
                await asyncio.sleep(3)
        logger.error("Could not connect Kafka consumer after 10 attempts")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
        if self._consumer:
            await self._consumer.stop()

    async def _consume(self) -> None:
        async for msg in self._consumer:
            try:
                data: dict = msg.value
                combat_id = data.get("battleId") or data.get("combat_id")
                is_bot = data.get("isBot", False)

                if not combat_id or not is_bot:
                    continue

                message_text = data.get("message", "").strip()
                if not message_text:
                    continue

                logger.info(f"[{combat_id}] Bot message: {message_text}")

                await self._room_manager.broadcast(
                    combat_id=combat_id,
                    payload={
                        "type": "system",
                        "message": message_text,
                        "combat_id": combat_id,
                    },
                )
            except Exception as e:
                logger.error(f"Error processing Kafka chat message: {e}")