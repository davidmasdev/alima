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
    backend_public_url: str = Field(default="http://localhost:8000", alias="BACKEND_PUBLIC_URL")
    frontend_public_url: str = Field(default="http://localhost:8081", alias="FRONTEND_PUBLIC_URL")
    email_verification_expire_hours: int = Field(
        default=24,
        alias="EMAIL_VERIFICATION_EXPIRE_HOURS",
    )
    password_reset_expire_minutes: int = Field(
        default=60,
        alias="PASSWORD_RESET_EXPIRE_MINUTES",
    )
    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_username: str | None = Field(default=None, alias="SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    smtp_from_email: str | None = Field(default=None, alias="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="Alima", alias="SMTP_FROM_NAME")
    ai_provider: str = Field(default="gemini", alias="AI_PROVIDER")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash-lite", alias="GEMINI_MODEL")
    ai_request_timeout_seconds: int = Field(default=60, alias="AI_REQUEST_TIMEOUT_SECONDS")
    ai_max_output_tokens: int = Field(default=4096, alias="AI_MAX_OUTPUT_TOKENS")
    ai_thinking_budget: int = Field(default=0, alias="AI_THINKING_BUDGET")
    google_oauth_client_id: str | None = Field(default=None, alias="GOOGLE_OAUTH_CLIENT_ID")
    open_food_facts_base_url: str = Field(
        default="https://world.openfoodfacts.org",
        alias="OPEN_FOOD_FACTS_BASE_URL",
    )
    open_food_facts_user_agent: str = Field(
        default="Alima/1.0 (tfg@example.com)",
        alias="OPEN_FOOD_FACTS_USER_AGENT",
    )
    open_food_facts_import_delay_seconds: float = Field(
        default=6.0,
        alias="OPEN_FOOD_FACTS_IMPORT_DELAY_SECONDS",
    )

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
