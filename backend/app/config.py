from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Runtime
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # LLM API Keys
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    DEMO_MOCK_LLM_FALLBACK: bool = True

    # Model Routing Configuration
    FAST_ROUTER_MODEL: str = "gpt-4o-mini"
    REASONING_DRAFT_MODEL: str = "gpt-4o"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 256
    BASELINE_SINGLE_MODEL: str = "gpt-4o"

    # Qdrant Vector DB
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "omnichannel_kb_v1"
    SEED_DIR: str = str(Path(__file__).resolve().parents[2] / "seed")
    AUTO_INGEST_SEED_ON_STARTUP: bool = True

    # Workflow A: HITL & Cryptographic Action Tokens
    HITL_CONFIDENCE_THRESHOLD: float = 0.75
    HITL_AUTO_APPROVE_ENABLED: bool = False
    HITL_ACTION_TOKEN_SECRET: str = (
        "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e"
    )
    HITL_TOKEN_EXPIRY_MINUTES: int = 1440

    # Workflow B: Multilingual Community Chat & Moderation
    SUPPORTED_LANGUAGES: str = "EN,PL,TR"
    CHAT_SLIDING_WINDOW_SIZE: int = 5
    CHAT_TOXICITY_THRESHOLD: float = 0.70
    DIGEST_CRON_HOUR: int = 18
    DIGEST_CRON_MINUTE: int = 0

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def supported_languages_list(self) -> List[str]:
        return [lang.strip().upper() for lang in self.SUPPORTED_LANGUAGES.split(",") if lang.strip()]

    @property
    def has_live_llm_key(self) -> bool:
        openai_ok = bool(
            self.OPENAI_API_KEY
            and not self.OPENAI_API_KEY.startswith("sk-your-")
            and len(self.OPENAI_API_KEY) > 20
        )
        anthropic_ok = bool(
            self.ANTHROPIC_API_KEY
            and not self.ANTHROPIC_API_KEY.startswith("sk-ant-your-")
            and len(self.ANTHROPIC_API_KEY) > 20
        )
        return openai_ok or anthropic_ok


@lru_cache()
def get_settings() -> Settings:
    return Settings()
