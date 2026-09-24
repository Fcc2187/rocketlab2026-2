from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações carregadas de variáveis de ambiente ou do arquivo .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "RocketLab API"
    project_version: str = "2026.2"
    environment: str = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./rocketlab.db"
    backend_cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"
    admin_username: str = ""
    admin_password_hash: str = ""
    auth_secret_key: SecretStr = SecretStr("")
    cache_ttl_seconds: int = Field(default=30, ge=0, le=3600)

    def validate_auth(self) -> None:
        if not self.admin_username.strip() or not self.admin_password_hash.startswith("$argon2id$"):
            raise ValueError("Configure ADMIN_USERNAME e ADMIN_PASSWORD_HASH (Argon2)")
        try:
            PasswordHasher().check_needs_rehash(self.admin_password_hash)
        except InvalidHashError as exc:
            raise ValueError("ADMIN_PASSWORD_HASH inválido") from exc
        if len(self.auth_secret_key.get_secret_value().encode("utf-8")) < 32:
            raise ValueError("AUTH_SECRET_KEY deve conter pelo menos 32 bytes")


@lru_cache
def get_settings() -> Settings:
    return Settings()
