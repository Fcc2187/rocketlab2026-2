import { useEffect, useState } from "react";
import { listMovies, getFilterOptions, getFeaturedMovie } from "./api/movies";
import type {
  MovieDetail,
  MovieFilterOptions,
  MovieListItem,
  MoviePage,
} from "./api/types";
import { MovieCard } from "./components/MovieCard";
import { Pagination, Rating, SkeletonGrid } from "./components/ui";
import { movieTitle } from "./movieTitle";
import { DeleteMovieModal } from "./features/DeleteMovieModal";
import { LoginModal } from "./features/LoginModal";
import { MovieDetails } from "./features/MovieDetails";
import { MovieForm } from "./features/MovieForm";
import { ReviewForm } from "./features/ReviewForm";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [catalogResult, setCatalogResult] = useState<{
    key: string;
    data: MoviePage | null;
    error: string | null;
  } | null>(null);
  const [filterOptions, setFilterOptions] = useState<MovieFilterOptions | null>(
    null,
  );
  const [filterError, setFilterError] = useState(false);
  const [hero, setHero] = useState<MovieDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<MovieListItem | null>(null);
  const [formId, setFormId] = useState<string | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovieListItem | null>(null);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState("");
  const admin = Boolean(token);
  const catalogKey = JSON.stringify([
    page,
    debouncedQuery,
    genre,
    year,
    revision,
  ]);
  const catalogLoading = catalogResult?.key !== catalogKey;
  const catalog = catalogLoading ? null : catalogResult.data;
  const catalogError = catalogLoading ? null : catalogResult.error;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    const controller = new AbortController();
    const key = JSON.stringify([page, debouncedQuery, genre, year, revision]);
    listMovies(
      {
        page,
        page_size: 10,
        q: debouncedQuery,
        ano: year ? Number(year) : undefined,
        genero: genre.trim(),
        poster_first: true,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.total_pages && page > result.total_pages) {
          setPage(result.total_pages);
          return;
        }
        setCatalogResult({ key, data: result, error: null });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setCatalogResult({ key, data: null, error: cause.message });
      });
    return () => controller.abort();
  }, [page, debouncedQuery, genre, year, revision]);
  useEffect(() => {
    const controller = new AbortController();
    getFilterOptions(controller.signal)
      .then((options) => {
        if (!controller.signal.aborted) {
          setFilterOptions(options);
          setFilterError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFilterError(true);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    getFeaturedMovie(controller.signal)
      .then((movie) => {
        if (!controller.signal.aborted) setHero(movie);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHero(null);
      });
    return () => controller.abort();
  }, [revision]);

  function refresh() {
    setRevision((value) => value + 1);
  }
  function resetFilters() {
    setQuery("");
    setGenre("");
    setYear("");
    setPage(1);
  }
  function expired() {
    setToken(null);
    setFormId(null);
    setDeleteTarget(null);
    setToast("Sua sessão expirou. Entre novamente para gerenciar o catálogo.");
    setLoginOpen(true);
  }
  function openReview(movie: MovieListItem) {
    setDetailId(null);
    setReviewTarget(movie);
  }
  function openEdit(movie: MovieListItem) {
    setDetailId(null);
    setFormId(movie.sk_movie_id);
  }
  function openDelete(movie: MovieListItem) {
    setDetailId(null);
    setDeleteTarget(movie);
  }

  return (
    <>
      <header className="relative z-20 border-b border-white/10 bg-bg/95">
        <div className="shell flex h-[72px] items-center justify-between gap-5">
          <div className="flex items-center gap-8">
            <a
              href="#inicio"
              className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"
            >
              <span
                className="brand-mark grid size-8 place-items-center rounded-lg bg-accent text-bg"
                aria-hidden="true"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 5h16v14H4zM4 10h16M8 5l3 5m3-5 3 5M9 14l6-2v4l-6-2Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              CineRate
            </a>
            <a
              className="nav-active hidden text-sm font-semibold text-ink sm:flex"
              href="#catalogo"
            >
              Catálogo
            </a>
          </div>
          <div className="hidden min-w-0 flex-1 justify-end md:flex">
            <label className="filter-search flex h-10 w-[222px] items-center gap-2">
              <span className="sr-only">Buscar filme por título</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="10.8"
                  cy="10.8"
                  r="6.8"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por título..."
              />
            </label>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {admin ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => setFormId("new")}
                >
                  + Adicionar filme
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setToken(null);
                    setToast("Sessão encerrada.");
                  }}
                >
                  Sair · AD
                </button>
              </>
            ) : (
              <button
                className="btn btn-outline"
                onClick={() => setLoginOpen(true)}
              >
                Entrar
              </button>
            )}
          </div>
          <div className="sm:hidden">
            <button
              className="btn btn-outline"
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              ☰
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav
            className="shell grid gap-2 border-t border-line py-3 sm:hidden"
            aria-label="Menu principal"
          >
            <a
              className="btn btn-outline"
              href="#catalogo"
              onClick={() => setMobileOpen(false)}
            >
              Catálogo
            </a>
            {admin ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setFormId("new");
                    setMobileOpen(false);
                  }}
                >
                  Adicionar filme
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setToken(null);
                    setMobileOpen(false);
                  }}
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                className="btn btn-outline"
                onClick={() => {
                  setLoginOpen(true);
                  setMobileOpen(false);
                }}
              >
                Entrar
              </button>
            )}
          </nav>
        )}
      </header>

      <section
        id="inicio"
        className="relative isolate min-h-[300px] overflow-hidden bg-[#18222a] sm:min-h-[452px]"
      >
        {(hero?.url_backdrop || hero?.url_poster) && (
          <img
            src={hero.url_backdrop || hero.url_poster || ""}
            alt=""
            className="absolute right-0 top-0 -z-20 h-full w-full object-cover object-center opacity-75 sm:w-[63%] sm:opacity-100"
          />
        )}
        <div className="hero-shade absolute inset-0 -z-10" />
        <div className="shell flex min-h-[300px] items-end py-9 sm:min-h-[452px] sm:items-center sm:py-12">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-accent">
              Filme em destaque
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              {hero ? movieTitle(hero.titulo) : "CineRate"}
            </h1>
            {hero && (
              <>
                <p className="mt-3 text-sm text-[#d2dedb]">
                  {[hero.ano_lancamento, ...hero.generos.slice(0, 2)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-4">
                  <Rating
                    score={hero.media_avaliacoes}
                    count={hero.quantidade_avaliacoes}
                    showCount
                  />
                </p>
              </>
            )}
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#d5dfdd] sm:line-clamp-3 sm:text-base">
              {hero?.sinopse ||
                "Seu catálogo de filmes, avaliações e resenhas em um só lugar."}
            </p>
            {hero && (
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => setDetailId(hero.sk_movie_id)}
                >
                  Ver detalhes
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => openReview(hero)}
                >
                  Avaliar
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <main id="catalogo" className="shell scroll-mt-6 pb-24 pt-9 sm:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-accent">
              Sua coleção, em um só lugar
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Explorar catálogo
            </h2>
            <p className="mt-2 text-sm text-muted">
              Busque, avalie e descubra os filmes cadastrados.
            </p>
          </div>
          {catalog && (
            <p className="text-sm text-muted">
              {catalog.total.toLocaleString("pt-BR")}{" "}
              {catalog.total === 1 ? "filme cadastrado" : "filmes cadastrados"}
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <label className="filter-search flex w-full min-w-[220px] items-center gap-3 md:w-[min(430px,42%)]">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="10.8"
                cy="10.8"
                r="6.8"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por título"
              aria-label="Buscar por título"
            />
          </label>
          <label className="filter-select min-w-[145px] flex-1 sm:flex-none">
            <span className="sr-only">Filtrar por gênero</span>
            <select
              value={genre}
              onChange={(event) => {
                setGenre(event.target.value);
                setPage(1);
              }}
              disabled={!filterOptions}
            >
              <option value="">Gênero: Todos</option>
              {filterOptions?.generos.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-select min-w-[130px] flex-1 sm:flex-none">
            <span className="sr-only">Filtrar por ano</span>
            <select
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                setPage(1);
              }}
              disabled={!filterOptions}
            >
              <option value="">Ano: Todos</option>
              {filterOptions?.anos.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filterError && (
          <p className="mt-2 text-sm text-danger">
            Não foi possível carregar os filtros.{" "}
            <button className="underline" onClick={refresh}>
              Tentar novamente
            </button>
          </p>
        )}
        <div className="mb-5 mt-12 flex items-end justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-xl font-bold">Todos os filmes</h2>
            <p className="mt-1 text-sm text-muted">
              {catalogError
                ? "Falha ao carregar o catálogo"
                : catalogLoading
                  ? "Carregando catálogo"
                  : query || genre || year
                    ? "Resultados da busca e dos filtros"
                    : "Explore todos os títulos da coleção"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {catalog && (
              <span className="text-sm text-muted">
                {catalog.total.toLocaleString("pt-BR")}{" "}
                {catalog.total === 1 ? "resultado" : "resultados"}
              </span>
            )}
            {query || genre || year ? (
              <button
                className="text-sm font-semibold text-accent hover:underline"
                onClick={resetFilters}
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        </div>
        {catalogLoading ? (
          <SkeletonGrid />
        ) : catalogError ? (
          <div
            role="alert"
            className="rounded-xl border border-line p-10 text-center"
          >
            <h3 className="text-lg font-bold">
              Não foi possível carregar o catálogo
            </h3>
            <p className="mt-2 text-sm text-muted">{catalogError}</p>
            <button className="btn btn-outline mt-5" onClick={refresh}>
              Tentar novamente
            </button>
          </div>
        ) : catalog?.total === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center">
            <h3 className="text-lg font-bold">
              {query || genre || year
                ? "Nenhum filme encontrado"
                : "Nenhum filme cadastrado"}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {query || genre || year
                ? "Tente outro título ou ajuste os filtros."
                : "O catálogo ainda está vazio."}
            </p>
            {query || genre || year ? (
              <button className="btn btn-outline mt-5" onClick={resetFilters}>
                Limpar filtros
              </button>
            ) : (
              admin && (
                <button
                  className="btn btn-primary mt-5"
                  onClick={() => setFormId("new")}
                >
                  Adicionar primeiro filme
                </button>
              )
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-5">
              {catalog?.items.map((movie) => (
                <MovieCard
                  key={movie.sk_movie_id}
                  movie={movie}
                  admin={admin}
                  onDetails={() => setDetailId(movie.sk_movie_id)}
                  onReview={() => openReview(movie)}
                  onEdit={() => openEdit(movie)}
                  onDelete={() => openDelete(movie)}
                />
              ))}
            </div>
            {catalog && (
              <Pagination
                page={catalog.page}
                totalPages={catalog.total_pages}
                onPage={setPage}
                label="Páginas do catálogo"
              />
            )}
          </>
        )}
      </main>
      <footer className="border-t border-line py-7 text-sm text-muted">
        <div className="shell flex flex-wrap justify-between gap-2">
          <span>
            <strong className="text-ink">CineRate</strong> · Seu cinema,
            organizado.
          </span>
          <span>Catálogo e avaliações de filmes</span>
        </div>
      </footer>
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border border-[#427960] bg-[#17392c] px-4 py-3 text-sm text-[#e4f8eb] shadow-xl"
        >
          {toast}
        </div>
      )}

      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onLogin={(value) => {
            setToken(value);
            setLoginOpen(false);
            setToast("Login realizado com sucesso.");
          }}
        />
      )}
      {detailId && (
        <MovieDetails
          id={detailId}
          revision={revision}
          admin={admin}
          onClose={() => setDetailId(null)}
          onReview={openReview}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      )}
      {reviewTarget && (
        <ReviewForm
          id={reviewTarget.sk_movie_id}
          title={reviewTarget.titulo}
          onClose={() => setReviewTarget(null)}
          onSaved={() => {
            const id = reviewTarget.sk_movie_id;
            setReviewTarget(null);
            setDetailId(id);
            refresh();
            setToast("Avaliação publicada com sucesso.");
          }}
        />
      )}
      {formId && token && (
        <MovieForm
          id={formId === "new" ? null : formId}
          token={token}
          onClose={() => setFormId(null)}
          onSaved={(movie) => {
            setFormId(null);
            setDetailId(movie.sk_movie_id);
            refresh();
            setToast(
              formId === "new"
                ? "Filme adicionado ao catálogo."
                : "Filme atualizado com sucesso.",
            );
          }}
          onUnauthorized={expired}
        />
      )}
      {deleteTarget && token && (
        <DeleteMovieModal
          movie={deleteTarget}
          token={token}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            setDetailId(null);
            refresh();
            setToast("Filme excluído do catálogo.");
          }}
          onUnauthorized={expired}
        />
      )}
    </>
  );
}
