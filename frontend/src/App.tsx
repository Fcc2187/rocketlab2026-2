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
      <a className="skip-link" href="#catalogo">
        Ir para o catálogo
      </a>
      <header className="site-header">
        <div className="shell site-header-inner">
          <a href="#inicio" className="brand">
            CineRate
          </a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            <a className="catalog-link" href="#catalogo">
              Catálogo
            </a>
          </nav>
          <div className="header-actions">
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
          <button
            className="btn btn-outline mobile-menu-toggle"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d={
                  mobileOpen
                    ? "m6 6 12 12M6 18 18 6"
                    : "M4 7h16M4 12h16M4 17h16"
                }
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <nav
            id="mobile-navigation"
            className="shell mobile-navigation"
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
        className={`hero ${hero?.url_backdrop || hero?.url_poster ? "" : "hero--plain"}`}
        aria-labelledby="featured-title"
      >
        <div className="hero-inner">
          {(hero?.url_backdrop || hero?.url_poster) && (
            <div className="hero-media">
              <img
                src={hero.url_backdrop || hero.url_poster || ""}
                alt=""
                fetchPriority="high"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
                onLoad={(event) => {
                  event.currentTarget.hidden = false;
                }}
              />
            </div>
          )}
          <div className="hero-content">
            <p className="hero-label">Filme em destaque</p>
            <h1 id="featured-title" className="hero-title">
              {hero ? movieTitle(hero.titulo) : "CineRate"}
            </h1>
            {hero && (
              <>
                <p className="hero-meta">
                  {[hero.ano_lancamento, ...hero.generos.slice(0, 2)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="hero-rating">
                  <Rating
                    score={hero.media_avaliacoes}
                    count={hero.quantidade_avaliacoes}
                    showCount
                  />
                </p>
              </>
            )}
            <p className="hero-synopsis">
              {hero?.sinopse ||
                "Seu catálogo de filmes, avaliações e resenhas em um só lugar."}
            </p>
            {hero && (
              <div className="hero-actions">
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

      <main id="catalogo" className="shell catalog" tabIndex={-1}>
        <h2 className="catalog-title">Explore o catálogo</h2>
        <div className="catalog-filters">
          <label className="filter-search">
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
          <label className="filter-select">
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
          <label className="filter-select">
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
          <p className="filter-error" role="alert">
            Não foi possível carregar os filtros.{" "}
            <button className="text-link underline" onClick={refresh}>
              Tentar novamente
            </button>
          </p>
        )}
        <div className="catalog-results" aria-live="polite" aria-atomic="true">
          <div>
            <h2 className="results-title">Todos os filmes</h2>
            {(catalogError || catalogLoading || query || genre || year) && (
              <p className="mt-1 text-sm text-muted">
                {catalogError
                  ? "Falha ao carregar o catálogo"
                  : catalogLoading
                    ? "Carregando catálogo"
                    : "Resultados da busca e dos filtros"}
              </p>
            )}
          </div>
          <div className="results-actions">
            {catalog && (
              <span className="text-sm text-muted">
                {catalog.total.toLocaleString("pt-BR")}{" "}
                {catalog.total === 1 ? "resultado" : "resultados"}
              </span>
            )}
            {query || genre || year ? (
              <button className="text-link" onClick={resetFilters}>
                Limpar filtros
              </button>
            ) : null}
          </div>
        </div>
        {catalogLoading ? (
          <SkeletonGrid />
        ) : catalogError ? (
          <div role="alert" className="catalog-state">
            <h3>Não foi possível carregar o catálogo</h3>
            <p className="mt-2 text-sm text-muted">{catalogError}</p>
            <button className="btn btn-outline mt-5" onClick={refresh}>
              Tentar novamente
            </button>
          </div>
        ) : catalog?.total === 0 ? (
          <div className="catalog-state">
            <h3>
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
            <div className="movie-grid">
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
      <footer className="site-footer">
        <div className="shell footer-inner">
          <span>
            <strong className="text-ink">CineRate</strong> · Seu cinema,
            organizado.
          </span>
          <span>Catálogo e avaliações de filmes</span>
        </div>
      </footer>
      {toast && (
        <div role="status" className="toast">
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
