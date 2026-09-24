from datetime import UTC, datetime, timedelta
from secrets import compare_digest
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings

TOKEN_SECONDS = 1800
ISSUER = "rocketlab-api"
AUDIENCE = "rocketlab-admin"
password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def authenticate(username: str, password: str) -> str:
    settings = get_settings()
    settings.validate_auth()
    try:
        valid_password = await run_in_threadpool(
            password_hash.verify, password, settings.admin_password_hash
        )
    except Exception as exc:
        raise RuntimeError("ADMIN_PASSWORD_HASH inválido") from exc
    if not (
        valid_password
        and compare_digest(username.encode("utf-8"), settings.admin_username.encode("utf-8"))
    ):
        raise unauthorized()
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": settings.admin_username,
            "iat": now,
            "exp": now + timedelta(seconds=TOKEN_SECONDS),
            "iss": ISSUER,
            "aud": AUDIENCE,
        },
        settings.auth_secret_key.get_secret_value(),
        algorithm="HS256",
    )


async def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> None:
    if credentials is None:
        raise unauthorized()
    settings = get_settings()
    settings.validate_auth()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.auth_secret_key.get_secret_value(),
            algorithms=["HS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"require": ["sub", "iat", "exp", "iss", "aud"]},
        )
    except InvalidTokenError as exc:
        raise unauthorized() from exc
    if payload["sub"] != settings.admin_username:
        raise unauthorized()
