from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()


def configure_sqlite_connection(async_engine: AsyncEngine) -> None:
    """Configura chaves estrangeiras e busca sem distinção de maiúsculas."""

    @event.listens_for(async_engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection: object, connection_record: object) -> None:
        del connection_record
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        dbapi_connection.create_function("unicode_casefold", 1, str.casefold)


engine = create_async_engine(settings.database_url, echo=settings.environment == "local")
configure_sqlite_connection(engine)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """Fornece uma sessão assíncrona por requisição."""

    async with AsyncSessionLocal() as session:
        yield session
