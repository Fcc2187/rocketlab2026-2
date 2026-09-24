from app.db.session import get_db
from app.main import app
from app.movies.models import (
    DimCompany,
    DimGenre,
    DimMovie,
    DimPerson,
    DimReview,
    FactMoviePerformance,
    MovieReview,
)


async def test_catalog_is_empty_when_database_has_no_movies(client) -> None:
    response = await client.get("/api/v1/movies")

    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "page": 1,
        "page_size": 20,
        "total": 0,
        "total_pages": 0,
    }


async def test_catalog_keeps_movies_with_same_title_in_stable_order(client) -> None:
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        session.add_all(
            [
                DimMovie(sk_movie_id="b" * 64, id_filme="2", titulo="Mesmo título"),
                DimMovie(sk_movie_id="a" * 64, id_filme="1", titulo="Mesmo título"),
            ]
        )
        await session.commit()

    response = await client.get("/api/v1/movies?page_size=1&page=2")

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert response.json()["total_pages"] == 2
    assert [item["sk_movie_id"] for item in response.json()["items"]] == ["b" * 64]


async def test_catalog_search_and_filters_intersect_without_duplicate_movies(client) -> None:
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        horror = DimGenre(sk_genre_id="g" * 64, nome_genero="Horror")
        drama = DimGenre(sk_genre_id="d" * 64, nome_genero="Drama")
        session.add_all(
            [
                DimMovie(
                    sk_movie_id="a" * 64,
                    id_filme="1",
                    titulo="The Ring",
                    ano_lancamento=2020,
                    genres=[horror, drama],
                ),
                DimMovie(
                    sk_movie_id="b" * 64,
                    id_filme="2",
                    titulo="Ring Two",
                    ano_lancamento=2021,
                    genres=[horror],
                ),
                DimMovie(sk_movie_id="c" * 64, id_filme="3", titulo="Other"),
            ]
        )
        await session.commit()

    response = await client.get("/api/v1/movies?q=RING&ano=2020&genero=horror")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert [item["titulo"] for item in response.json()["items"]] == ["The Ring"]
    assert response.json()["items"][0]["generos"] == ["Drama", "Horror"]
    assert (await client.get("/api/v1/movies?page=4&page_size=1")).json()["items"] == []
    assert (await client.get("/api/v1/movies?page=0")).status_code == 422
    assert (await client.get("/api/v1/movies?page_size=101")).status_code == 422


async def test_movie_detail_contains_related_data_and_review_average(client) -> None:
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        movie = DimMovie(
            sk_movie_id="m" * 64,
            id_filme="42",
            titulo="Filme completo",
            ano_lancamento=2020,
            sinopse="Sinopse",
            genres=[DimGenre(nome_genero="Drama")],
            companies=[DimCompany(nome_produtora="Estúdio")],
            people=[
                DimPerson(nome_pessoa="Ana", tipo_pessoa="Diretor"),
                DimPerson(nome_pessoa="Bia", tipo_pessoa="Ator"),
            ],
            performance=FactMoviePerformance(lucro_usd=5, lucro_brl=25),
            reviews_summary=DimReview(qtd_avaliacoes_usuarios=1, nota_media_usuarios=9.8),
            reviews=[MovieReview(nome="Cris", nota=9.8, comentario="Ótimo")],
        )
        session.add(movie)
        await session.commit()

    response = await client.get(f"/api/v1/movies/{'m' * 64}")

    assert response.status_code == 200
    body = response.json()
    assert body["titulo"] == "Filme completo"
    assert body["generos"] == ["Drama"]
    assert body["produtoras"] == ["Estúdio"]
    assert body["diretores"] == ["Ana"]
    assert body["atores"] == ["Bia"]
    assert body["roteiristas"] == []
    assert body["desempenho"]["lucro_usd"] == 5
    assert body["quantidade_avaliacoes"] == 1
    assert body["media_estrelas"] == 4.9
    assert (await client.get("/api/v1/movies/missing")).status_code == 404


async def test_create_movies_with_same_title_and_validate_names(client) -> None:
    payload = {
        "titulo": " Filme novo ",
        "ano_lancamento": 2024,
        "generos": ["Drama"],
        "diretores": ["Ana"],
    }

    first = await client.post("/api/v1/movies", json=payload)
    second = await client.post("/api/v1/movies", json=payload)

    assert first.status_code == second.status_code == 201
    assert first.json()["titulo"] == "Filme novo"
    assert first.json()["id_filme"].startswith("manual:")
    assert first.json()["sk_movie_id"] != second.json()["sk_movie_id"]
    assert first.json()["diretores"] == ["Ana"]
    assert (await client.get("/api/v1/movies")).json()["total"] == 2
    assert (await client.post("/api/v1/movies", json={"titulo": "   "})).status_code == 422
    assert (
        await client.post("/api/v1/movies", json={"titulo": "Novo", "generos": ["", "Drama"]})
    ).status_code == 422


async def test_patch_changes_only_sent_fields_and_delete_removes_movie(client) -> None:
    session_factory = app.dependency_overrides[get_db]
    async for session in session_factory():
        session.add(
            DimMovie(
                sk_movie_id="m" * 64,
                id_filme="42",
                titulo="Original",
                ano_lancamento=2000,
                genres=[DimGenre(nome_genero="Drama")],
                people=[
                    DimPerson(nome_pessoa="Ana", tipo_pessoa="Diretor"),
                    DimPerson(nome_pessoa="Bia", tipo_pessoa="Ator"),
                ],
                reviews=[MovieReview(nome="Cris", nota=8, comentario="Bom")],
            )
        )
        await session.commit()

    response = await client.patch(
        f"/api/v1/movies/{'m' * 64}",
        json={"ano_lancamento": 2001, "diretores": [], "generos": ["Comedy"]},
    )

    assert response.status_code == 200
    assert response.json()["titulo"] == "Original"
    assert response.json()["ano_lancamento"] == 2001
    assert response.json()["generos"] == ["Comedy"]
    assert response.json()["diretores"] == []
    assert response.json()["atores"] == ["Bia"]
    assert (await client.patch("/api/v1/movies/missing", json={"titulo": "X"})).status_code == 404
    deleted = await client.delete(f"/api/v1/movies/{'m' * 64}")
    assert deleted.status_code == 204
    assert (await client.get(f"/api/v1/movies/{'m' * 64}")).status_code == 404
    assert (await client.delete("/api/v1/movies/missing")).status_code == 404
