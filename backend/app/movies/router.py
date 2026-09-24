from fastapi import APIRouter, Depends, Query

from app.auth.security import require_admin
from app.db.session import SessionDep
from app.movies import service
from app.movies.schemas import (
    MovieCreate,
    MovieDetail,
    MoviePage,
    MoviePatch,
    ReviewCreate,
    ReviewCreated,
    ReviewPage,
)

router = APIRouter()


@router.get("", response_model=MoviePage)
async def list_movies(
    db: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    ano: int | None = None,
    genero: str | None = None,
) -> MoviePage:
    return await service.list_movies(db, page, page_size, q, ano, genero)


@router.post(
    "",
    response_model=MovieDetail,
    status_code=201,
    dependencies=[Depends(require_admin)],
    responses={401: {"description": "Autenticação necessária"}},
)
async def create_movie(payload: MovieCreate, db: SessionDep) -> MovieDetail:
    return await service.create_movie(payload, db)


@router.get(
    "/{sk_movie_id}",
    response_model=MovieDetail,
    responses={404: {"description": "Filme não encontrado"}},
)
async def get_movie(sk_movie_id: str, db: SessionDep) -> MovieDetail:
    return await service.get_movie(sk_movie_id, db)


@router.patch(
    "/{sk_movie_id}",
    response_model=MovieDetail,
    dependencies=[Depends(require_admin)],
    responses={
        401: {"description": "Autenticação necessária"},
        404: {"description": "Filme não encontrado"},
    },
)
async def patch_movie(sk_movie_id: str, payload: MoviePatch, db: SessionDep) -> MovieDetail:
    return await service.patch_movie(sk_movie_id, payload, db)


@router.delete(
    "/{sk_movie_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
    responses={
        401: {"description": "Autenticação necessária"},
        404: {"description": "Filme não encontrado"},
    },
)
async def delete_movie(sk_movie_id: str, db: SessionDep) -> None:
    await service.delete_movie(sk_movie_id, db)


@router.get(
    "/{sk_movie_id}/reviews",
    response_model=ReviewPage,
    responses={404: {"description": "Filme não encontrado"}},
)
async def list_reviews(
    sk_movie_id: str,
    db: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ReviewPage:
    return await service.list_reviews(sk_movie_id, page, page_size, db)


@router.post(
    "/{sk_movie_id}/reviews",
    response_model=ReviewCreated,
    status_code=201,
    responses={404: {"description": "Filme não encontrado"}},
)
async def create_review(sk_movie_id: str, payload: ReviewCreate, db: SessionDep) -> ReviewCreated:
    return await service.create_review(sk_movie_id, payload, db)
