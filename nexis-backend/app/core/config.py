import os
from typing import List, Union, Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Nexis Core Engine"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Ollama Local Service Configuration
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_CONTEXT_WINDOW: int = 2048
    OLLAMA_TEMPERATURE: float = 0.1  # Low temperature for deterministic code and diffs
    OLLAMA_TIMEOUT_SECONDS: float = 120.0

    # Repository Roots Storage
    REPOS_STORAGE_PATH: str = "/srv/repos"

    # SQLite Database Configuration
    SQLITE_DB_PATH: str = "data/nexis.db"

    # Security & API Auth
    API_KEY_SECRET: str = "nexis-secret-key-production-32chars"
    ALLOWED_HOSTS: List[str] = Field(default_factory=lambda: ["*"])

    # Cloud Providers & Observability
    VERCEL_API_KEY: Optional[str] = None
    VERCEL_API_TOKEN: Optional[str] = None
    RENDER_API_TOKEN: Optional[str] = None
    VERCEL_PROJECT_NAME: Optional[str] = None

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
    }


settings = Settings()
