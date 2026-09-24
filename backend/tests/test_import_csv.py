import csv
import os
import sqlite3
import subprocess
import sys

HEADERS = {
    "dim_movies": (
        "sk_movie_id,id_filme,titulo,data_lancamento,ano_lancamento,"
        "duracao_minutos,status_filme,sinopse,url_poster,url_backdrop"
    ),
    "dim_genres": "nome_genero,sk_genre_id",
    "dim_companies": "nome_produtora,sk_company_id",
    "dim_people": "nome_pessoa,tipo_pessoa,sk_person_id",
    "fact_movies_performance": (
        "sk_movie_id,orcamento_usd,receita_usd,lucro_usd,orcamento_brl,"
        "receita_brl,lucro_brl,popularidade,nota_tmdb,qtd_tmdb,nota_imdb,qtd_imdb"
    ),
    "bridge_movie_genre": "sk_movie_id,sk_genre_id",
    "bridge_movie_company": "sk_movie_id,sk_company_id",
    "bridge_movie_person": "sk_movie_id,sk_person_id",
    "dim_reviews": "sk_review_id,sk_movie_id,qtd_avaliacoes_usuarios,nota_media_usuarios",
    "movies_reviews": "sk_movie_review_id,sk_movie_id,nome,nota,comentario",
}


def write_csvs(
    directory, *, invalid_genre=False, invalid_date=False, truncated_movie=False
) -> None:
    directory.mkdir()
    for name, header in HEADERS.items():
        with (directory / f"{name}.csv").open("w", encoding="utf-8", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(header.split(","))
            if name == "dim_movies":
                row = [
                    "m",
                    "42",
                    "Filme, Um",
                    "2020-99-99" if invalid_date else "",
                    "2020",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
                writer.writerow(row[:-1] if truncated_movie else row)
            elif name == "dim_genres":
                writer.writerow(["Drama", "g"])
            elif name == "bridge_movie_genre":
                writer.writerow(["m", "missing" if invalid_genre else "g"])
            elif name == "movies_reviews":
                writer.writerow(["r1", "m", "Ana", "9.8", "Bom, mesmo"])
                writer.writerow(["r2", "m", "Bia", "0.2", "Ruim"])
            elif name == "dim_reviews":
                writer.writerow(["summary", "m", "1", "9.8"])


def run_import(directory, database_url):
    return subprocess.run(
        [sys.executable, "-m", "app.movies.import_csv", str(directory)],
        capture_output=True,
        text=True,
        env={**os.environ, "DATABASE_URL": database_url},
        check=False,
    )


def test_import_reads_quoted_csv_and_reconciles_review_summary(tmp_path, database_url) -> None:
    data_dir = tmp_path / "csvs"
    write_csvs(data_dir)

    result = run_import(data_dir, database_url)

    assert result.returncode == 0, result.stderr
    with sqlite3.connect(tmp_path / "test.db") as db:
        assert db.execute("SELECT titulo, ano_lancamento FROM dim_movies").fetchone() == (
            "Filme, Um",
            2020,
        )
        assert db.execute(
            "SELECT comentario FROM movie_reviews WHERE sk_movie_review_id='r1'"
        ).fetchone() == ("Bom, mesmo",)
        assert db.execute(
            "SELECT qtd_avaliacoes_usuarios, nota_media_usuarios FROM dim_reviews"
        ).fetchone() == (2, 5.0)

    second_run = run_import(data_dir, database_url)
    assert second_run.returncode != 0
    assert "já contém filmes" in second_run.stderr


def test_import_rolls_back_on_invalid_foreign_key(tmp_path, database_url) -> None:
    data_dir = tmp_path / "csvs"
    write_csvs(data_dir, invalid_genre=True)

    result = run_import(data_dir, database_url)

    assert result.returncode != 0
    with sqlite3.connect(tmp_path / "test.db") as db:
        assert db.execute("SELECT count(*) FROM dim_movies").fetchone() == (0,)


def test_import_rejects_invalid_date_without_partial_data(tmp_path, database_url) -> None:
    data_dir = tmp_path / "csvs"
    write_csvs(data_dir, invalid_date=True)

    result = run_import(data_dir, database_url)

    assert result.returncode != 0
    assert "dim_movies.csv:2" in result.stderr
    with sqlite3.connect(tmp_path / "test.db") as db:
        assert db.execute("SELECT count(*) FROM dim_movies").fetchone() == (0,)


def test_import_rejects_truncated_csv_row(tmp_path, database_url) -> None:
    data_dir = tmp_path / "csvs"
    write_csvs(data_dir, truncated_movie=True)

    result = run_import(data_dir, database_url)

    assert result.returncode != 0
    assert "dim_movies.csv:2" in result.stderr
    with sqlite3.connect(tmp_path / "test.db") as db:
        assert db.execute("SELECT count(*) FROM dim_movies").fetchone() == (0,)
