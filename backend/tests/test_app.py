import httpx

from app.main import app


async def test_health_check() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_openapi_documents_payloads_and_missing_movie_errors(client) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    for schema in ("MovieCreate", "MoviePatch", "ReviewCreate"):
        assert spec["components"]["schemas"][schema]["examples"]
    for path, methods in {
        "/api/v1/movies/{sk_movie_id}": ("get", "patch", "delete"),
        "/api/v1/movies/{sk_movie_id}/reviews": ("get", "post"),
    }.items():
        for method in methods:
            assert "404" in spec["paths"][path][method]["responses"]
