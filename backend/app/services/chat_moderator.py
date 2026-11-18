import logging
import uuid
from datetime import datetime
from typing import Dict, List

from app.config import get_settings
from app.models.schemas import (
    ChatMessageCreate,
    ChatMessageRecord,
    DailyDigestReport,
    SupportedLanguage,
)
from app.services.ai_router import ai_router
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class MultilingualChatModeratorService:
    """
    Workflow B — Real-Time Multilingual Community & Chat Automation:
    - Processes Polish (PL), English (EN), and Turkish (TR) messages asynchronously
    - Runs Fast-Tier Toxicity & Safety Moderation
    - Performs Sliding-Window Context-Aware Translation (using the last 5 messages)
    - Generates Executive Daily Digests via Reasoning LLM (manual trigger + APScheduler cron)
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.messages: List[ChatMessageRecord] = []
        self.digests: List[DailyDigestReport] = []

    async def process_incoming_message(
        self, payload: ChatMessageCreate
    ) -> ChatMessageRecord:
        # 1. Capture sliding window of the last N (default 5) safe messages for context
        window_size = self.settings.CHAT_SLIDING_WINDOW_SIZE
        safe_history = [m for m in self.messages if m.moderation.is_safe]
        sliding_window = safe_history[-window_size:]
        window_preview = [
            f"[{m.original_language.value}] {m.author_name}: {m.original_content[:70]}"
            for m in sliding_window
        ]

        # 2. Fast-Tier Toxicity & Safety Moderation
        moderation, mod_metric = await ai_router.moderate_chat_message(
            payload.content, payload.language
        )

        # 3. Fast-Tier Context-Aware Translation across EN, PL, TR using the 5-message window
        translations, trans_metric = await ai_router.translate_with_sliding_window(
            payload.content, payload.language, sliding_window
        )

        record = ChatMessageRecord(
            message_id=f"CHAT-{uuid.uuid4().hex[:6].upper()}",
            author_name=payload.author_name,
            author_handle=payload.author_handle,
            author_role=payload.author_role,
            channel=payload.channel,
            original_language=payload.language,
            original_content=payload.content,
            moderation=moderation,
            translations=translations,
            sliding_window_context_size=len(sliding_window),
            sliding_window_preview=window_preview,
            llm_metrics=[mod_metric, trans_metric],
        )
        self.messages.append(record)

        await ws_manager.broadcast_event(
            "CHAT_MESSAGE_PROCESSED", record.model_dump(mode="json")
        )
        return record

    async def trigger_daily_digest(
        self, trigger_type: str = "MANUAL_TRIGGER"
    ) -> DailyDigestReport:
        report = await ai_router.generate_daily_digest(
            self.messages, trigger_type=trigger_type
        )
        self.digests.insert(0, report)
        await ws_manager.broadcast_event(
            "DAILY_DIGEST_GENERATED", report.model_dump(mode="json")
        )
        return report

    def list_messages(self) -> List[ChatMessageRecord]:
        return list(self.messages)

    def list_digests(self) -> List[DailyDigestReport]:
        return list(self.digests)


chat_moderator = MultilingualChatModeratorService()
