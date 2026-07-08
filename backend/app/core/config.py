try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:14b"
    ollama_fast_model: str = "qwen2.5:7b"
    opencode_command: str = "opencode"
    opencode_model: str = "openai/gpt-5.2-codex"
    opencode_timeout_seconds: int = 180
    router_complexity_threshold: float = 0.62
    router_max_context_chars: int = 12000
    router_max_messages: int = 14
    router_request_timeout_seconds: int = 120
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    ai_provider: str = "gemini"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
