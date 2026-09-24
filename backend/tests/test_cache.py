from pydantic import BaseModel

from app.core.config import get_settings
from app.db.session import get_db
from app.main import app
from app.movies import cache as cache_module
from app.movies.cache import MovieCache
from app.movies.models import DimMovie, MovieReview


async def test_public_reads_use_cache_until_anonymous_review_invalidates_it(client) -> None:
    movie_id = "m" * 64
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        session.add(DimMovie(sk_movie_id=movie_id, id_filme="42", titulo="Original"))
        await session.commit()

    list_url = "/api/v1/movies"
    detail_url = f"/api/v1/movies/{movie_id}"
    reviews_url = f"{detail_url}/reviews"
    assert (await client.get(list_url)).json()["items"][0]["titulo"] == "Original"
    assert (await client.get(detail_url)).json()["titulo"] == "Original"
    assert (await client.get(reviews_url)).json()["total"] == 0

    async for session in session_factory():
        movie = await session.get(DimMovie, movie_id)
        movie.titulo = "Mudou no banco"
        session.add(MovieReview(sk_movie_id=movie_id, nome="Prévia", nota=8, comentario="Bom"))
        await session.commit()

    assert (await client.get(list_url)).json()["items"][0]["titulo"] == "Original"
    assert (await client.get(detail_url)).json()["titulo"] == "Original"
    assert (await client.get(reviews_url)).json()["total"] == 0

    response = await client.post(
        reviews_url, json={"nome": "Visitante", "nota": 10, "comentario": "Ótimo"}
    )
    assert response.status_code == 201
    assert (await client.get(list_url)).json()["items"][0]["titulo"] == "Mudou no banco"
    assert (await client.get(detail_url)).json()["titulo"] == "Mudou no banco"
    assert (await client.get(reviews_url)).json()["total"] == 2


async def test_catalog_writes_invalidate_cached_pages_and_details(client, admin_headers) -> None:
    assert (await client.get("/api/v1/movies")).json()["total"] == 0
    created = await client.post(
        "/api/v1/movies", json={"titulo": "Antes"}, headers=admin_headers
    )
    movie_id = created.json()["sk_movie_id"]
    assert (await client.get("/api/v1/movies")).json()["total"] == 1
    assert (await client.get(f"/api/v1/movies/{movie_id}")).json()["titulo"] == "Antes"

    changed = await client.patch(
        f"/api/v1/movies/{movie_id}", json={"titulo": "Depois"}, headers=admin_headers
    )
    assert changed.status_code == 200
    assert (await client.get(f"/api/v1/movies/{movie_id}")).json()["titulo"] == "Depois"
    assert (await client.get("/api/v1/movies")).json()["items"][0]["titulo"] == "Depois"

    deleted = await client.delete(f"/api/v1/movies/{movie_id}", headers=admin_headers)
    assert deleted.status_code == 204
    assert (await client.get("/api/v1/movies")).json()["total"] == 0
    assert (await client.get(f"/api/v1/movies/{movie_id}")).status_code == 404


async def test_cache_keeps_filters_pages_and_movies_separate(client, admin_headers) -> None:
    first = await client.post(
        "/api/v1/movies", json={"titulo": "Alfa", "ano_lancamento": 2020},
        headers=admin_headers,
    )
    second = await client.post(
        "/api/v1/movies", json={"titulo": "Beta", "ano_lancamento": 2021},
        headers=admin_headers,
    )
    first_id = first.json()["sk_movie_id"]
    second_id = second.json()["sk_movie_id"]

    alfa = (await client.get("/api/v1/movies?q=alfa")).json()
    beta = (await client.get("/api/v1/movies?q=beta")).json()
    year = (await client.get("/api/v1/movies?ano=2020")).json()
    page_two = (await client.get("/api/v1/movies?page_size=1&page=2")).json()
    assert [item["titulo"] for item in alfa["items"]] == ["Alfa"]
    assert [item["titulo"] for item in beta["items"]] == ["Beta"]
    assert [item["titulo"] for item in year["items"]] == ["Alfa"]
    assert [item["titulo"] for item in page_two["items"]] == ["Beta"]
    assert (await client.get(f"/api/v1/movies/{first_id}")).json()["titulo"] == "Alfa"
    assert (await client.get(f"/api/v1/movies/{second_id}")).json()["titulo"] == "Beta"


async def test_failed_write_does_not_invalidate_cache(client, admin_headers) -> None:
    created = await client.post(
        "/api/v1/movies", json={"titulo": "Antes"}, headers=admin_headers
    )
    movie_id = created.json()["sk_movie_id"]
    detail_url = f"/api/v1/movies/{movie_id}"
    assert (await client.get(detail_url)).json()["titulo"] == "Antes"

    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        movie = await session.get(DimMovie, movie_id)
        movie.titulo = "Alterado fora da API"
        await session.commit()

    failed = await client.patch(
        detail_url, json={"titulo": "   "}, headers=admin_headers
    )
    assert failed.status_code == 422
    assert (await client.get(detail_url)).json()["titulo"] == "Antes"


class CachedValue(BaseModel):
    value: int


def test_cache_expires_evicts_lru_and_ignores_old_reads(monkeypatch) -> None:
    monkeypatch.setenv("CACHE_TTL_SECONDS", "1")
    get_settings.cache_clear()
    clock = [0.0]
    monkeypatch.setattr(cache_module, "monotonic", lambda: clock[0])
    cache = MovieCache()
    first_generation = cache.generation
    cache.put_if_current(("first",), CachedValue(value=1), first_generation)
    assert cache.get(("first",)) == CachedValue(value=1)
    clock[0] = 1.0
    assert cache.get(("first",)) is None

    for index in range(256):
        cache.put_if_current((index,), CachedValue(value=index), cache.generation)
    cache.get((0,))
    cache.put_if_current((256,), CachedValue(value=256), cache.generation)
    assert cache.get((1,)) is None
    assert cache.get((0,)) == CachedValue(value=0)

    old_generation = cache.generation
    cache.invalidate()
    cache.put_if_current(("late-read",), CachedValue(value=9), old_generation)
    assert cache.get(("late-read",)) is None

    monkeypatch.setenv("CACHE_TTL_SECONDS", "0")
    get_settings.cache_clear()
    cache.put_if_current(("disabled",), CachedValue(value=5), cache.generation)
    assert cache.get(("disabled",)) is None
    get_settings.cache_clear()
