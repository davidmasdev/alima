from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/alima",
        alias="DATABASE_URL",
    )
    jwt_secret_key: str = Field(default="change-me", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60,
        alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    backend_cors_origins: str = Field(
        default="http://localhost:8081,http://localhost:19006",
        alias="BACKEND_CORS_ORIGINS",
    )
    ai_provider: str = Field(default="gemini", alias="AI_PROVIDER")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    ai_request_timeout_seconds: int = Field(default=60, alias="AI_REQUEST_TIMEOUT_SECONDS")
    ai_max_output_tokens: int = Field(default=4096, alias="AI_MAX_OUTPUT_TOKENS")
    ai_thinking_budget: int = Field(default=0, alias="AI_THINKING_BUDGET")

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
