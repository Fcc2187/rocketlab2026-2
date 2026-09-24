from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.movies.cache import movie_cache
from app.movies.models import DimGenre, DimMovie, DimPerson, DimReview, MovieReview
from app.movies.schemas import (
    MovieCreate,
    MovieDetail,
    MovieListItem,
    MoviePage,
    MoviePatch,
    MoviePerformance,
    ReviewCreate,
    ReviewCreated,
    ReviewItem,
    ReviewPage,
)


async def list_movies(
    db: AsyncSession,
    page: int,
    page_size: int,
    q: str | None = None,
    ano: int | None = None,
    genero: str | None = None,
) -> MoviePage:
    cache_key = ("list", page, page_size, q.strip().casefold() if q else None, ano,
                 genero.strip().casefold() if genero else None)
    cached = movie_cache.get(cache_key)
    if cached is not None:
        return cached
    generation = movie_cache.generation
    filters = []
    if q and q.strip():
        term = q.strip().casefold().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        filters.append(func.unicode_casefold(DimMovie.titulo).like(f"%{term}%", escape="\\"))
    if ano is not None:
        filters.append(DimMovie.ano_lancamento == ano)
    if genero and genero.strip():
        filters.append(
            DimMovie.genres.any(
                func.unicode_casefold(DimGenre.nome_genero) == genero.strip().casefold()
            )
        )
    total = await db.scalar(select(func.count()).select_from(DimMovie).where(*filters)) or 0
    result = await db.scalars(
        select(DimMovie)
        .where(*filters)
        .options(selectinload(DimMovie.genres), selectinload(DimMovie.reviews_summary))
        .order_by(DimMovie.titulo, DimMovie.sk_movie_id)
        .offset(min((page - 1) * page_size, 2**63 - 1))
        .limit(page_size)
    )
    items = [
        MovieListItem(
            sk_movie_id=movie.sk_movie_id,
            titulo=movie.titulo,
            ano_lancamento=movie.ano_lancamento,
            url_poster=movie.url_poster,
            generos=[genre.nome_genero for genre in movie.genres],
            quantidade_avaliacoes=(
                movie.reviews_summary.qtd_avaliacoes_usuarios if movie.reviews_summary else 0
            ),
            media_avaliacoes=(
                movie.reviews_summary.nota_media_usuarios
                if movie.reviews_summary and movie.reviews_summary.nota_media_usuarios is not None
                else None
            ),
        )
        for movie in result
    ]
    page_result = MoviePage(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=(total + page_size - 1) // page_size,
    )
    movie_cache.put_if_current(cache_key, page_result, generation)
    return page_result


async def resolve_genres(db: AsyncSession, names: list[str]) -> list[DimGenre]:
    if not names:
        return []
    found = {
        genre.nome_genero.casefold(): genre
        for genre in await db.scalars(
            select(DimGenre)
            .where(
                func.unicode_casefold(DimGenre.nome_genero).in_(name.casefold() for name in names)
            )
            .order_by(DimGenre.sk_genre_id)
        )
    }
    return [found.get(name.casefold()) or DimGenre(nome_genero=name) for name in names]


async def resolve_directors(db: AsyncSession, names: list[str]) -> list[DimPerson]:
    if not names:
        return []
    found = {
        person.nome_pessoa.casefold(): person
        for person in await db.scalars(
            select(DimPerson).where(
                DimPerson.tipo_pessoa == "Diretor",
                func.unicode_casefold(DimPerson.nome_pessoa).in_(name.casefold() for name in names),
            )
            .order_by(DimPerson.sk_person_id)
        )
    }
    return [
        found.get(name.casefold()) or DimPerson(nome_pessoa=name, tipo_pessoa="Diretor")
        for name in names
    ]


async def create_movie(payload: MovieCreate, db: AsyncSession) -> MovieDetail:
    movie = DimMovie(
        id_filme=f"manual:{uuid4().hex}",
        titulo=payload.titulo,
        ano_lancamento=payload.ano_lancamento,
        sinopse=payload.sinopse,
        genres=await resolve_genres(db, payload.generos),
        people=await resolve_directors(db, payload.diretores),
    )
    db.add(movie)
    await db.commit()
    movie_cache.invalidate()
    return await get_movie(movie.sk_movie_id, db)


async def get_movie(sk_movie_id: str, db: AsyncSession) -> MovieDetail:
    cache_key = ("detail", sk_movie_id)
    cached = movie_cache.get(cache_key)
    if cached is not None:
        return cached
    generation = movie_cache.generation
    movie = await db.scalar(
        select(DimMovie)
        .options(
            selectinload(DimMovie.genres),
            selectinload(DimMovie.companies),
            selectinload(DimMovie.people),
            selectinload(DimMovie.performance),
            selectinload(DimMovie.reviews_summary),
        )
        .where(DimMovie.sk_movie_id == sk_movie_id)
    )
    if movie is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    summary = movie.reviews_summary
    detail = MovieDetail(
        sk_movie_id=movie.sk_movie_id,
        id_filme=movie.id_filme,
        titulo=movie.titulo,
        data_lancamento=movie.data_lancamento,
        ano_lancamento=movie.ano_lancamento,
        duracao_minutos=movie.duracao_minutos,
        status_filme=movie.status_filme,
        sinopse=movie.sinopse,
        url_poster=movie.url_poster,
        url_backdrop=movie.url_backdrop,
        generos=[genre.nome_genero for genre in movie.genres],
        produtoras=[company.nome_produtora for company in movie.companies],
        atores=[person.nome_pessoa for person in movie.people if person.tipo_pessoa == "Ator"],
        diretores=[
            person.nome_pessoa for person in movie.people if person.tipo_pessoa == "Diretor"
        ],
        roteiristas=[
            person.nome_pessoa for person in movie.people if person.tipo_pessoa == "Roteirista"
        ],
        desempenho=(
            MoviePerformance.model_validate(movie.performance) if movie.performance else None
        ),
        quantidade_avaliacoes=summary.qtd_avaliacoes_usuarios if summary else 0,
        media_avaliacoes=(
            summary.nota_media_usuarios
            if summary and summary.nota_media_usuarios is not None
            else None
        ),
    )
    movie_cache.put_if_current(cache_key, detail, generation)
    return detail


async def patch_movie(
    sk_movie_id: str, payload: MoviePatch, db: AsyncSession
) -> MovieDetail:
    movie = await db.scalar(
        select(DimMovie)
        .options(selectinload(DimMovie.genres), selectinload(DimMovie.people))
        .where(DimMovie.sk_movie_id == sk_movie_id)
    )
    if movie is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    for field in ("titulo", "ano_lancamento", "sinopse"):
        if field in payload.model_fields_set:
            setattr(movie, field, getattr(payload, field))
    if "generos" in payload.model_fields_set:
        movie.genres = await resolve_genres(db, payload.generos or [])
    if "diretores" in payload.model_fields_set:
        movie.people = [person for person in movie.people if person.tipo_pessoa != "Diretor"]
        movie.people.extend(await resolve_directors(db, payload.diretores or []))
    await db.commit()
    movie_cache.invalidate()
    return await get_movie(sk_movie_id, db)


async def delete_movie(sk_movie_id: str, db: AsyncSession) -> None:
    movie = await db.get(DimMovie, sk_movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    await db.delete(movie)
    await db.commit()
    movie_cache.invalidate()


async def list_reviews(
    sk_movie_id: str,
    page: int,
    page_size: int,
    db: AsyncSession,
) -> ReviewPage:
    cache_key = ("reviews", sk_movie_id, page, page_size)
    cached = movie_cache.get(cache_key)
    if cached is not None:
        return cached
    generation = movie_cache.generation
    exists = await db.scalar(
        select(DimMovie.sk_movie_id).where(DimMovie.sk_movie_id == sk_movie_id)
    )
    if exists is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    total = (
        await db.scalar(
            select(func.count())
            .select_from(MovieReview)
            .where(MovieReview.sk_movie_id == sk_movie_id)
        )
        or 0
    )
    reviews = await db.scalars(
        select(MovieReview)
        .where(MovieReview.sk_movie_id == sk_movie_id)
        .order_by(MovieReview.created_at, MovieReview.sk_movie_review_id)
        .offset(min((page - 1) * page_size, 2**63 - 1))
        .limit(page_size)
    )
    page_result = ReviewPage(
        items=[
            ReviewItem(
                sk_movie_review_id=review.sk_movie_review_id,
                nome=review.nome,
                nota=review.nota,
                comentario=review.comentario,
                created_at=review.created_at,
            )
            for review in reviews
        ],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=(total + page_size - 1) // page_size,
    )
    movie_cache.put_if_current(cache_key, page_result, generation)
    return page_result


async def create_review(
    sk_movie_id: str, payload: ReviewCreate, db: AsyncSession
) -> ReviewCreated:
    exists = await db.scalar(
        select(DimMovie.sk_movie_id).where(DimMovie.sk_movie_id == sk_movie_id)
    )
    if exists is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    review = MovieReview(
        sk_movie_id=sk_movie_id,
        nome=payload.nome,
        nota=payload.nota,
        comentario=payload.comentario,
    )
    db.add(review)
    await db.flush()
    count, mean = (
        await db.execute(
            select(func.count(), func.avg(MovieReview.nota)).where(
                MovieReview.sk_movie_id == sk_movie_id
            )
        )
    ).one()
    summary = await db.scalar(select(DimReview).where(DimReview.sk_movie_id == sk_movie_id))
    if summary is None:
        db.add(
            DimReview(
                sk_movie_id=sk_movie_id,
                qtd_avaliacoes_usuarios=count,
                nota_media_usuarios=mean,
            )
        )
    else:
        summary.qtd_avaliacoes_usuarios = count
        summary.nota_media_usuarios = mean
    await db.commit()
    movie_cache.invalidate()
    await db.refresh(review)
    return ReviewCreated(
        sk_movie_review_id=review.sk_movie_review_id,
        nome=review.nome,
        nota=review.nota,
        comentario=review.comentario,
        created_at=review.created_at,
        quantidade_avaliacoes=count,
        media_avaliacoes=mean,
    )
