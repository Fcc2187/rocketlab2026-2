from app.db.session import get_db
from app.main import app
from app.movies.models import DimMovie, MovieReview


async def test_review_history_is_paginated_and_converts_historical_notes(client) -> None:
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        session.add(
            DimMovie(
                sk_movie_id="m" * 64,
                id_filme="42",
                titulo="Filme",
                reviews=[
                    MovieReview(
                        sk_movie_review_id="a" * 64, nome="Ana", nota=0.9, comentario="Fraco"
                    ),
                    MovieReview(
                        sk_movie_review_id="b" * 64, nome="Bia", nota=9.8, comentario="Bom"
                    ),
                ],
            )
        )
        await session.commit()

    response = await client.get(f"/api/v1/movies/{'m' * 64}/reviews?page=1&page_size=1")

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert response.json()["total_pages"] == 2
    assert response.json()["items"][0]["nota_estrelas"] == 0.45
    assert response.json()["items"][0]["created_at"]
    assert (await client.get(f"/api/v1/movies/{'m' * 64}/reviews?page=3&page_size=1")).json()[
        "items"
    ] == []
    assert (await client.get("/api/v1/movies/missing/reviews")).status_code == 404


async def test_new_reviews_update_average_in_list_and_detail(client) -> None:
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        session.add(DimMovie(sk_movie_id="m" * 64, id_filme="42", titulo="Filme"))
        await session.commit()

    url = f"/api/v1/movies/{'m' * 64}/reviews"
    first = await client.post(
        url, json={"nome": " Ana ", "nota_estrelas": 4, "comentario": " Bom filme "}
    )
    second = await client.post(url, json={"nome": "Bia", "nota_estrelas": 5, "comentario": "Ótimo"})

    assert first.status_code == second.status_code == 201
    assert first.json()["nome"] == "Ana"
    assert first.json()["nota_estrelas"] == 4
    assert first.json()["quantidade_avaliacoes"] == 1
    assert second.json()["quantidade_avaliacoes"] == 2
    assert second.json()["media_estrelas"] == 4.5
    assert (await client.get("/api/v1/movies")).json()["items"][0]["media_estrelas"] == 4.5
    assert (await client.get(f"/api/v1/movies/{'m' * 64}")).json()["media_estrelas"] == 4.5
    assert (await client.get(url)).json()["total"] == 2


async def test_new_review_rejects_bad_input_and_missing_movie(client) -> None:
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        session.add(DimMovie(sk_movie_id="m" * 64, id_filme="42", titulo="Filme"))
        await session.commit()

    url = f"/api/v1/movies/{'m' * 64}/reviews"
    for note in (0, 6, "NaN"):
        response = await client.post(
            url, json={"nome": "Ana", "nota_estrelas": note, "comentario": "Bom"}
        )
        assert response.status_code == 422
    assert (
        await client.post(url, json={"nome": " ", "nota_estrelas": 3, "comentario": "Bom"})
    ).status_code == 422
    assert (
        await client.post(url, json={"nome": "Ana", "nota_estrelas": 3, "comentario": " "})
    ).status_code == 422
    assert (
        await client.post(
            "/api/v1/movies/missing/reviews",
            json={"nome": "Ana", "nota_estrelas": 3, "comentario": "Bom"},
        )
    ).status_code == 404
