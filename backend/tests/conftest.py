from collections.abc import AsyncIterator

import httpx
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.session import enable_sqlite_foreign_keys, get_db
from app.main import app


@pytest.fixture
def database_url(tmp_path, monkeypatch) -> str:
    database_url = f"sqlite+aiosqlite:///{(tmp_path / 'test.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()
    command.upgrade(Config("alembic.ini"), "head")
    return database_url


@pytest.fixture
async def client(database_url) -> AsyncIterator[httpx.AsyncClient]:

    engine = create_async_engine(database_url)
    enable_sqlite_foreign_keys(engine)
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
        get_settings.cache_clear()
        await engine.dispose()
