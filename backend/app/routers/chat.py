from typing import Dict, List, Literal
from fastapi import APIRouter, Query

from app.models.schemas import (
    ChatMessageCreate,
    ChatMessageRecord,
    DailyDigestReport,
    SupportedLanguage,
)
from app.services.chat_moderator import chat_moderator

router = APIRouter(
    prefix="/api/chat",
    tags=["Workflow B — Multilingual Community Chat, Moderation & Digest"],
)

# Preset Multi-User Conversation Sequence (PL / TR / EN) + Toxicity Test
DEMO_CHAT_SEQUENCE: List[ChatMessageCreate] = [
    ChatMessageCreate(
        author_name="Marek Kowalski",
        author_handle="@marek_sre_waw",
        author_role="DevOps Lead (Warsaw 🇵🇱)",
        language=SupportedLanguage.PL,
        content="Cześć wszystkim, widzimy ten błąd 500 przy logowaniu SAML przez Okta na naszym klastrze stagingowym — czy to kwestia certyfikatu X.509 czy przesunięcia zegara NTP?",
        channel="#global-dev-support",
    ),
    ChatMessageCreate(
        author_name="Elif Demir",
        author_handle="@elif_cloud_ist",
        author_role="Staff Platform Eng (Istanbul 🇹🇷)",
        language=SupportedLanguage.TR,
        content="Aynı sorunu dün yaşadık! Admin Console -> Security altında Clock Skew Tolerance değerini 180 saniyeye ayarlamak sorunu anında çözdü.",
        channel="#global-dev-support",
    ),
    ChatMessageCreate(
        author_name="Sarah Jenkins",
        author_handle="@sjenkins_uk",
        author_role="Solutions Architect (London 🇬🇧)",
        language=SupportedLanguage.EN,
        content="Thanks Elif! That fixed our SSO login too. By the way, does anyone know if switching our webhook script to the `/api/v1/tickets/batch` endpoint avoids the HTTP 429 rate limit?",
        channel="#global-dev-support",
    ),
    ChatMessageCreate(
        author_name="Marek Kowalski",
        author_handle="@marek_sre_waw",
        author_role="DevOps Lead (Warsaw 🇵🇱)",
        language=SupportedLanguage.PL,
        content="Tak, przełączyliśmy nasz importer historyczny na ten endpoint `/api/v1/tickets/batch` (do 500 zgłoszeń w jednym żądaniu) i od tego czasu zero błędów HTTP 429.",
        channel="#global-dev-support",
    ),
    ChatMessageCreate(
        author_name="Elif Demir",
        author_handle="@elif_cloud_ist",
        author_role="Staff Platform Eng (Istanbul 🇹🇷)",
        language=SupportedLanguage.TR,
        content="Harika, hemen aktarım işçimizi güncelliyorum! Bu arada `.edu.tr` üniversite doğrulaması %80 Academic Pro indirimini ($9.80/ay) ve $100 kredi hakkını otomatik açıyor mu?",
        channel="#global-dev-support",
    ),
    ChatMessageCreate(
        author_name="Anon_Rage_Bot",
        author_handle="@rage_spammer_99",
        author_role="Unverified Guest",
        language=SupportedLanguage.EN,
        content="You guys are complete idiots and a garbage team, this whole platform is a scam! Click my free crypto airdrop-claim link now or I will ddos your gateway!",
        channel="#global-dev-support",
    ),
]


@router.post("/message", response_model=ChatMessageRecord)
async def post_chat_message(payload: ChatMessageCreate) -> ChatMessageRecord:
    """
    Processes a live community message in Polish (PL), English (EN), or Turkish (TR):
    1. Runs Fast-Tier Toxicity & Safety Moderation
    2. Performs Sliding-Window Context-Aware Translation using the last 5 safe messages
    3. Broadcasts real-time update to all connected WebSocket clients
    """
    return await chat_moderator.process_incoming_message(payload)


@router.get("/messages", response_model=List[ChatMessageRecord])
async def list_chat_messages() -> List[ChatMessageRecord]:
    """Returns the multilingual chat stream with moderation flags and translations."""
    return chat_moderator.list_messages()


@router.post("/digest", response_model=DailyDigestReport)
async def trigger_daily_digest() -> DailyDigestReport:
    """
    Triggers the Reasoning LLM (`gpt-4o`) to synthesize an Executive Daily Community Digest
    across all Polish, English, and Turkish conversations and moderation events.
    """
    return await chat_moderator.trigger_daily_digest(trigger_type="MANUAL_TRIGGER")


@router.get("/digests", response_model=List[DailyDigestReport])
async def list_daily_digests() -> List[DailyDigestReport]:
    """Returns all generated daily community digest reports."""
    return chat_moderator.list_digests()


@router.post("/demo", response_model=List[ChatMessageRecord])
async def run_chat_demo_sequence(
    mode: Literal["full_conversation", "toxic_test_only"] = Query(
        default="full_conversation"
    ),
) -> List[ChatMessageRecord]:
    """
    Executes the multi-user PL/TR/EN community conversation showcase demonstrating
    5-message sliding-window context resolution + real-time toxicity quarantine.
    """
    results: List[ChatMessageRecord] = []
    if mode == "toxic_test_only":
        rec = await chat_moderator.process_incoming_message(DEMO_CHAT_SEQUENCE[-1])
        results.append(rec)
    else:
        for msg in DEMO_CHAT_SEQUENCE:
            rec = await chat_moderator.process_incoming_message(msg)
            results.append(rec)
    return results
