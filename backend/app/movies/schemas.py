from datetime import date, datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
GenreName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class MovieListItem(BaseModel):
    sk_movie_id: str
    titulo: str
    ano_lancamento: int | None
    url_poster: str | None
    generos: list[str]
    quantidade_avaliacoes: int
    media_avaliacoes: float | None


class MoviePage(BaseModel):
    items: list[MovieListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class MovieFilterOptions(BaseModel):
    generos: list[str]
    anos: list[int]


class MoviePerformance(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    orcamento_usd: float | None
    receita_usd: float | None
    lucro_usd: float
    orcamento_brl: float | None
    receita_brl: float | None
    lucro_brl: float
    popularidade: float | None
    nota_tmdb: float | None
    qtd_tmdb: int | None
    nota_imdb: float | None
    qtd_imdb: int | None


class MovieDetail(MovieListItem):
    id_filme: str
    data_lancamento: date | None
    duracao_minutos: int | None
    status_filme: str | None
    sinopse: str | None
    url_backdrop: str | None
    produtoras: list[str]
    atores: list[str]
    diretores: list[str]
    roteiristas: list[str]
    desempenho: MoviePerformance | None


class ReviewItem(BaseModel):
    sk_movie_review_id: str
    nome: str
    nota: float
    comentario: str
    created_at: datetime


class ReviewPage(BaseModel):
    items: list[ReviewItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class ReviewCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"nome": "Maria", "nota": 9, "comentario": "Gostei."}
            ]
        }
    )

    nome: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    nota: float = Field(ge=0, le=10, allow_inf_nan=False)
    comentario: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)
    ]


class ReviewCreated(ReviewItem):
    quantidade_avaliacoes: int
    media_avaliacoes: float


class MoviePatch(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"ano_lancamento": 2024}]})

    titulo: Title | None = None
    ano_lancamento: int | None = Field(default=None, ge=1, le=9999)
    sinopse: str | None = Field(default=None, max_length=4000)
    generos: list[GenreName] | None = None
    diretores: list[PersonName] | None = None

    @field_validator("generos", "diretores")
    @classmethod
    def unique_names(cls, names: list[str] | None) -> list[str] | None:
        if names is not None and len({name.casefold() for name in names}) != len(names):
            raise ValueError("Nomes duplicados")
        return names

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for field in ("titulo", "generos", "diretores"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} não pode ser nulo")
        return self


class MovieCreate(MoviePatch):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "titulo": "Meu filme",
                    "ano_lancamento": 2024,
                    "sinopse": "Uma história.",
                    "generos": ["Drama"],
                    "diretores": ["Ana Silva"],
                }
            ]
        }
    )

    titulo: Title
    generos: list[GenreName] = Field(default_factory=list)
    diretores: list[PersonName] = Field(default_factory=list)
