import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.schemas import GlobalTelemetrySummary
from app.routers import chat, kb, tickets
from app.services.ai_router import ai_router
from app.services.chat_moderator import chat_moderator
from app.services.hitl_engine import hitl_engine
from app.services.rag_service import rag_service
from app.services.websocket_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("omnichannel.main")

settings = get_settings()
scheduler = AsyncIOScheduler()


async def scheduled_end_of_day_digest_job() -> None:
    """APScheduler Cron Job: Automatically generates the end-of-day community digest."""
    logger.info("Executing APScheduler Cron Job: Automated End-of-Day Community Digest")
    await chat_moderator.trigger_daily_digest(trigger_type="APSCHEDULER_CRON")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Omnichannel AI Operations & Support Hub Backend...")
    if settings.AUTO_INGEST_SEED_ON_STARTUP:
        ingest_summary = rag_service.ingest_seed_directory()
        logger.info("Seed Knowledge Base auto-ingested: %s", ingest_summary)

    # Start APScheduler for automated daily community digest cron job
    scheduler.add_job(
        scheduled_end_of_day_digest_job,
        CronTrigger(hour=settings.DIGEST_CRON_HOUR, minute=settings.DIGEST_CRON_MINUTE),
        id="daily_community_digest_cron",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "APScheduler started: Daily Community Digest cron scheduled for %02d:%02d UTC.",
        settings.DIGEST_CRON_HOUR,
        settings.DIGEST_CRON_MINUTE,
    )
    yield
    scheduler.shutdown(wait=False)
    logger.info("Omnichannel AI Hub Backend shut down cleanly.")


app = FastAPI(
    title="AegisOps AI — Omnichannel AI Operations & Support Hub API",
    description=(
        "Unified Production AI Platform combining Workflow A (Intelligent Support Triage, Qdrant RAG & "
        "Cryptographic HITL Approval Engine) and Workflow B (Real-Time Multilingual EN/PL/TR Community "
        "Moderation, Sliding-Window Translation & Automated Daily Digest)."
    ),
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

app.include_router(tickets.router)
app.include_router(kb.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """System health, Qdrant connection status, active model router tiers, and scheduler status."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "qdrant_engine": rag_service.connection_mode,
        "qdrant_collection": rag_service.collection_name,
        "kb_chunks_indexed": len(rag_service.list_all_chunks()),
        "router_models": {
            "fast_tier": settings.FAST_ROUTER_MODEL,
            "reasoning_tier": settings.REASONING_DRAFT_MODEL,
            "baseline_comparison": settings.BASELINE_SINGLE_MODEL,
            "live_api_key_detected": settings.has_live_llm_key,
        },
        "hitl_config": {
            "confidence_threshold": hitl_engine.confidence_threshold,
            "tickets_in_memory": len(hitl_engine.tickets),
            "emails_dispatched": len(hitl_engine.dispatched_emails),
        },
        "chat_scheduler": {
            "running": scheduler.running,
            "cron_schedule_utc": f"{settings.DIGEST_CRON_HOUR:02d}:{settings.DIGEST_CRON_MINUTE:02d}",
            "sliding_window_size": settings.CHAT_SLIDING_WINDOW_SIZE,
            "supported_languages": settings.supported_languages_list,
        },
    }


@app.get("/api/telemetry", response_model=GlobalTelemetrySummary)
async def get_telemetry() -> GlobalTelemetrySummary:
    """Returns live Cost & Latency Saved vs. Single-Model telemetry across all LLM calls."""
    return ai_router.get_telemetry_summary()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Real-time Mission Control WebSocket stream for ticket pipeline, HITL, chat, and cost telemetry."""
    await ws_manager.connect(websocket)
    try:
        # Send initial snapshot upon connection
        await websocket.send_json(
            {
                "event": "INITIAL_SNAPSHOT",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "telemetry": ai_router.get_telemetry_summary().model_dump(mode="json"),
                    "tickets": [t.model_dump(mode="json") for t in hitl_engine.list_tickets()],
                    "dispatched_emails": [
                        e.model_dump(mode="json") for e in hitl_engine.dispatched_emails
                    ],
                    "chat_messages": [
                        m.model_dump(mode="json") for m in chat_moderator.list_messages()
                    ],
                    "digests": [
                        d.model_dump(mode="json") for d in chat_moderator.list_digests()
                    ],
                    "confidence_threshold": hitl_engine.confidence_threshold,
                },
            }
        )
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "PONG", "timestamp": datetime.utcnow().isoformat() + "Z"})
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)
