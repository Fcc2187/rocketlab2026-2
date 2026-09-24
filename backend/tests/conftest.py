from collections.abc import AsyncIterator

import httpx
import pytest
from alembic import command
from alembic.config import Config
from pwdlib import PasswordHash
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.session import configure_sqlite_connection, get_db
from app.main import app
from app.movies.cache import movie_cache

TEST_PASSWORD = "senha-teste"
TEST_PASSWORD_HASH = PasswordHash.recommended().hash(TEST_PASSWORD)


@pytest.fixture
def database_url(tmp_path, monkeypatch) -> str:
    database_url = f"sqlite+aiosqlite:///{(tmp_path / 'test.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", TEST_PASSWORD_HASH)
    monkeypatch.setenv("AUTH_SECRET_KEY", "s" * 32)
    get_settings.cache_clear()
    command.upgrade(Config("alembic.ini"), "head")
    return database_url


@pytest.fixture
async def client(database_url) -> AsyncIterator[httpx.AsyncClient]:

    movie_cache.invalidate()
    engine = create_async_engine(database_url)
    configure_sqlite_connection(engine)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def test_db() -> AsyncIterator:
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = test_db
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http_client:
            yield http_client
    finally:
        app.dependency_overrides.clear()
        movie_cache.invalidate()
        get_settings.cache_clear()
        await engine.dispose()


@pytest.fixture
async def admin_headers(client) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
