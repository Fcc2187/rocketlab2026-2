import { useRef } from "react";
import type { MovieListItem } from "../api/types";
import { movieTitle } from "../movieTitle";
import { Poster, Rating } from "./ui";

export function MovieCard({
  movie,
  admin,
  onDetails,
  onReview,
  onEdit,
  onDelete,
}: {
  movie: MovieListItem;
  admin: boolean;
  onDetails: () => void;
  onReview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const title = movieTitle(movie.titulo);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const chooseAction = (callback: () => void) => {
    menuRef.current?.removeAttribute("open");
    callback();
  };
  return (
    <article className="movie-card">
      {admin && (
        <details ref={menuRef} className="movie-menu">
          <summary
            className="movie-menu-toggle"
            aria-label={`Opções para ${title}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </summary>
          <div className="movie-menu-panel">
            <button
              className="movie-menu-item"
              onClick={() => chooseAction(onDetails)}
            >
              Ver detalhes
            </button>
            <button
              className="movie-menu-item"
              onClick={() => chooseAction(onEdit)}
            >
              Editar
            </button>
            <button
              className="movie-menu-item text-danger"
              onClick={() => chooseAction(onDelete)}
            >
              Excluir
            </button>
          </div>
        </details>
      )}
      <button
        type="button"
        onClick={onDetails}
        className="movie-poster-action"
        aria-label={`Ver detalhes de ${title}`}
      >
        <Poster src={movie.url_poster} title={title} />
      </button>
      <div className="movie-card-copy">
        <h3 className="movie-card-title">
          <button onClick={onDetails}>{title}</button>
        </h3>
        <p className="movie-card-meta">
          {movie.ano_lancamento ?? "Ano não informado"}
          {movie.generos.length > 0 &&
            ` · ${movie.generos.slice(0, 2).join(" · ")}`}
        </p>
        <p className="movie-card-rating">
          <Rating
            score={movie.media_avaliacoes}
            count={movie.quantidade_avaliacoes}
          />
        </p>
        <button
          type="button"
          className="btn btn-outline mt-auto w-full"
          onClick={onReview}
        >
          Avaliar
        </button>
      </div>
    </article>
  );
}
