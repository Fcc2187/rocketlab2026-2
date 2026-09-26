import { useState } from "react";
import { ApiError } from "../api/client";
import { deleteMovie } from "../api/movies";
import type { MovieListItem } from "../api/types";
import { ErrorText, Modal } from "../components/ui";
import { movieTitle } from "../movieTitle";

export function DeleteMovieModal({
  movie,
  token,
  onClose,
  onDeleted,
  onUnauthorized,
}: {
  movie: MovieListItem;
  token: string;
  onClose: () => void;
  onDeleted: () => void;
  onUnauthorized: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteMovie(movie.sk_movie_id, token);
      onDeleted();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível excluir o filme.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Excluir filme?"
      onClose={onClose}
      className="admin-modal delete-modal"
    >
      <p className="delete-description">
        Excluir “{movieTitle(movie.titulo)}”? Esta ação não poderá ser desfeita.
      </p>
      <ErrorText message={error} autoFocus />
      <div className="form-actions" aria-busy={busy}>
        <button
          className="btn btn-outline"
          onClick={onClose}
          autoFocus
          ref={(button) => {
            if (button) button.autofocus = true;
          }}
        >
          Cancelar
        </button>
        <button className="btn btn-danger" onClick={confirm} disabled={busy}>
          {busy ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </Modal>
  );
}
