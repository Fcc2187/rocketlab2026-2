from datetime import UTC, datetime, timedelta

import jwt
import pytest
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.main import app


async def test_admin_can_log_in(client, monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", PasswordHash.recommended().hash("senha-teste"))
    monkeypatch.setenv("AUTH_SECRET_KEY", "s" * 32)
    get_settings.cache_clear()

    response = await client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "senha-teste"}
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["expires_in"] == 1800
    assert response.json()["access_token"]
    assert "senha-teste" not in response.text
    assert "ADMIN_PASSWORD_HASH" not in response.text
    assert "AUTH_SECRET_KEY" not in response.text


async def test_anonymous_user_cannot_create_movie(client) -> None:
    response = await client.post("/api/v1/movies", json={"titulo": "Não autorizado"})

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert (await client.get("/api/v1/movies")).json()["total"] == 0


async def test_invalid_hash_prevents_startup(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", "$argon2id$broken")
    monkeypatch.setenv("AUTH_SECRET_KEY", "s" * 32)
    get_settings.cache_clear()

    with pytest.raises(ValueError, match="ADMIN_PASSWORD_HASH"):
        async with app.router.lifespan_context(app):
            pass


async def test_username_too_long_prevents_startup(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_USERNAME", "a" * 121)
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", PasswordHash.recommended().hash("senha-teste"))
    monkeypatch.setenv("AUTH_SECRET_KEY", "s" * 32)
    get_settings.cache_clear()

    with pytest.raises(ValueError, match="ADMIN_USERNAME"):
        async with app.router.lifespan_context(app):
            pass


@pytest.mark.parametrize("missing", ["ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "AUTH_SECRET_KEY"])
async def test_missing_auth_setting_prevents_startup(database_url, monkeypatch, missing) -> None:
    monkeypatch.setenv(missing, "")
    get_settings.cache_clear()

    with pytest.raises(ValueError):
        async with app.router.lifespan_context(app):
            pass


async def test_server_starts_with_admin_credentials(database_url) -> None:
    async with app.router.lifespan_context(app):
        pass


async def test_login_rejects_wrong_credentials_without_leaking_secrets(client) -> None:
    for username, password in (
        ("outro", "senha-teste"),
        ("usuário", "senha-teste"),
        ("admin", "errada"),
    ):
        response = await client.post(
            "/api/v1/auth/login", json={"username": username, "password": password}
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Credenciais inválidas"}
        assert "senha-teste" not in response.text


async def test_login_rejects_invalid_unicode_credentials(client) -> None:
    for body in (
        b'{"username":"\\ud800","password":"senha-teste"}',
        b'{"username":"admin","password":"\\ud800"}',
    ):
        response = await client.post(
            "/api/v1/auth/login", content=body, headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


async def test_only_catalog_maintenance_requires_admin(client, admin_headers) -> None:
    created = await client.post(
        "/api/v1/movies", json={"titulo": "Público"}, headers=admin_headers
    )
    assert created.status_code == 201
    movie_id = created.json()["sk_movie_id"]

    for method, url, payload in (
        ("POST", "/api/v1/movies", {"titulo": "Recusado"}),
        ("PATCH", f"/api/v1/movies/{movie_id}", {"titulo": "Recusado"}),
        ("DELETE", f"/api/v1/movies/{movie_id}", None),
    ):
        response = await client.request(method, url, json=payload)
        assert response.status_code == 401

    assert (await client.get("/api/v1/movies")).status_code == 200
    assert (await client.get(f"/api/v1/movies/{movie_id}")).json()["titulo"] == "Público"
    assert (await client.get(f"/api/v1/movies/{movie_id}/reviews")).status_code == 200
    anonymous_review = await client.post(
        f"/api/v1/movies/{movie_id}/reviews",
        json={"nome": "Visitante", "nota": 10, "comentario": "Gostei"},
    )
    assert anonymous_review.status_code == 201
    assert (await client.get("/health")).status_code == 200

    paths = (await client.get("/openapi.json")).json()["paths"]
    login_operation = paths["/api/v1/auth/login"]["post"]
    assert "application/json" in login_operation["requestBody"]["content"]
    assert "200" in login_operation["responses"]
    assert "security" not in login_operation
    for method, path in (
        ("post", "/api/v1/movies"),
        ("patch", "/api/v1/movies/{sk_movie_id}"),
        ("delete", "/api/v1/movies/{sk_movie_id}"),
    ):
        assert paths[path][method]["security"]
    assert "security" not in paths["/api/v1/movies/{sk_movie_id}/reviews"]["post"]


async def test_invalid_tokens_cannot_update_movie(client, admin_headers) -> None:
    created = await client.post(
        "/api/v1/movies", json={"titulo": "Original"}, headers=admin_headers
    )
    movie_id = created.json()["sk_movie_id"]
    now = datetime.now(UTC)
    claims = {
        "sub": "admin", "iat": now, "exp": now + timedelta(minutes=30),
        "iss": "rocketlab-api", "aud": "rocketlab-admin",
    }
    bad_tokens = (
        "corrompido",
        jwt.encode({**claims, "exp": now - timedelta(seconds=1)}, "s" * 32, algorithm="HS256"),
        jwt.encode(claims, "outra-chave-" * 3, algorithm="HS256"),
        jwt.encode({**claims, "iss": "outro"}, "s" * 32, algorithm="HS256"),
        jwt.encode({**claims, "aud": "outro"}, "s" * 32, algorithm="HS256"),
        jwt.encode({**claims, "sub": "outro"}, "s" * 32, algorithm="HS256"),
    )
    for token in bad_tokens:
        response = await client.patch(
            f"/api/v1/movies/{movie_id}",
            json={"titulo": "Fraude"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"
    assert (await client.get(f"/api/v1/movies/{movie_id}")).json()["titulo"] == "Original"
