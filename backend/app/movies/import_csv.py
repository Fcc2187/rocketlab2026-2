"""Importa os CSVs iniciais em um banco SQLite já migrado com Alembic."""

import argparse
import csv
import sqlite3
from datetime import date
from decimal import Decimal
from pathlib import Path

from app.core.config import get_settings

FILES = (
    ("dim_movies.csv", "dim_movies"),
    ("dim_genres.csv", "dim_genres"),
    ("dim_companies.csv", "dim_companies"),
    ("dim_people.csv", "dim_people"),
    ("fact_movies_performance.csv", "fact_movies_performance"),
    ("bridge_movie_genre.csv", "bridge_movie_genre"),
    ("bridge_movie_company.csv", "bridge_movie_company"),
    ("bridge_movie_person.csv", "bridge_movie_person"),
    ("movies_reviews.csv", "movie_reviews"),
    ("dim_reviews.csv", "dim_reviews"),
)
INTEGER_COLUMNS = {
    "ano_lancamento",
    "duracao_minutos",
    "qtd_tmdb",
    "qtd_imdb",
    "qtd_avaliacoes_usuarios",
}
DECIMAL_COLUMNS = {
    "orcamento_usd",
    "receita_usd",
    "lucro_usd",
    "orcamento_brl",
    "receita_brl",
    "lucro_brl",
    "popularidade",
    "nota_tmdb",
    "nota_imdb",
    "nota",
    "nota_media_usuarios",
}


def database_path() -> Path:
    url = get_settings().database_url
    for prefix in ("sqlite+aiosqlite:///", "sqlite:///"):
        if url.startswith(prefix):
            return Path(url.removeprefix(prefix))
    raise ValueError("A carga aceita apenas DATABASE_URL SQLite em arquivo")


def convert(column: str, value: str | None) -> str | int | float | None:
    if value is None or value == "":
        return None
    if column == "data_lancamento":
        return date.fromisoformat(value).isoformat()
    if column in INTEGER_COLUMNS:
        number = Decimal(value)
        if number != number.to_integral_value():
            raise ValueError(f"{column} deve ser inteiro: {value}")
        return int(number)
    if column in DECIMAL_COLUMNS:
        return float(Decimal(value))
    return value


def insert_batch(
    db: sqlite3.Connection,
    sql: str,
    rows: list[tuple[int, tuple]],
    filename: str,
) -> None:
    db.execute("SAVEPOINT csv_batch")
    try:
        db.executemany(sql, [row for _, row in rows])
    except sqlite3.Error as exc:
        db.execute("ROLLBACK TO csv_batch")
        for line, row in rows:
            try:
                db.execute(sql, row)
            except sqlite3.Error as exc:
                raise ValueError(f"{filename}:{line}: {exc}") from exc
        raise RuntimeError(f"{filename}: falha no lote") from exc
    finally:
        db.execute("RELEASE csv_batch")


def import_file(db: sqlite3.Connection, directory: Path, filename: str, table: str) -> int:
    count = 0
    with (directory / filename).open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        columns = reader.fieldnames
        if not columns or any(not column or not column.isidentifier() for column in columns):
            raise ValueError(f"{filename}: cabeçalho inválido")
        sql = (
            f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join('?' for _ in columns)})"
        )
        batch: list[tuple[int, tuple]] = []
        for row in reader:
            if None in row:
                raise ValueError(f"{filename}:{reader.line_num}: colunas extras no registro")
            try:
                values = tuple(convert(column, row[column]) for column in columns)
            except (KeyError, ValueError) as exc:
                raise ValueError(f"{filename}:{reader.line_num}: {exc}") from exc
            batch.append((reader.line_num, values))
            if len(batch) == 1000:
                insert_batch(db, sql, batch, filename)
                count += len(batch)
                batch.clear()
        if batch:
            insert_batch(db, sql, batch, filename)
            count += len(batch)
    return count


def reconcile_reviews(db: sqlite3.Connection) -> None:
    db.execute(
        "DELETE FROM dim_reviews WHERE sk_movie_id NOT IN "
        "(SELECT DISTINCT sk_movie_id FROM movie_reviews)"
    )
    db.execute(
        "UPDATE dim_reviews SET "
        "qtd_avaliacoes_usuarios = (SELECT COUNT(*) FROM movie_reviews r "
        "WHERE r.sk_movie_id = dim_reviews.sk_movie_id), "
        "nota_media_usuarios = (SELECT AVG(nota) FROM movie_reviews r "
        "WHERE r.sk_movie_id = dim_reviews.sk_movie_id)"
    )
    db.execute(
        "INSERT INTO dim_reviews "
        "(sk_review_id, sk_movie_id, qtd_avaliacoes_usuarios, nota_media_usuarios) "
        "SELECT lower(hex(randomblob(32))), r.sk_movie_id, COUNT(*), AVG(r.nota) "
        "FROM movie_reviews r LEFT JOIN dim_reviews d ON d.sk_movie_id = r.sk_movie_id "
        "WHERE d.sk_movie_id IS NULL GROUP BY r.sk_movie_id"
    )


def import_catalog(directory: Path) -> dict[str, int]:
    directory = directory.resolve()
    counts = {}
    with sqlite3.connect(database_path()) as db:
        db.execute("PRAGMA foreign_keys = ON")
        if db.execute("SELECT EXISTS(SELECT 1 FROM dim_movies)").fetchone()[0]:
            raise ValueError("O banco já contém filmes; carga inicial cancelada")
        db.execute("BEGIN")
        with db:
            for filename, table in FILES:
                counts[table] = import_file(db, directory, filename, table)
            reconcile_reviews(db)
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="Diretório com os dez arquivos CSV")
    args = parser.parse_args()
    try:
        counts = import_catalog(args.directory)
    except (OSError, sqlite3.Error, ValueError) as exc:
        parser.exit(1, f"{exc}\n")
    for table, count in counts.items():
        print(f"{table}: {count}")


if __name__ == "__main__":
    main()
