import { useEffect, useState } from "react";
import { getMovie } from "../api/movies";
import { listReviews } from "../api/reviews";
import type { MovieDetail, ReviewPage } from "../api/types";
import { ErrorText, Modal, Pagination, Poster, Rating } from "../components/ui";
import { movieTitle } from "../movieTitle";

function Facts({ label, values }: { label: string; values: string[] }) {
  return (
    values.length > 0 && (
      <div className="detail-fact">
        <dt>{label}</dt>
        <dd>{values.join(", ")}</dd>
      </div>
    )
  );
}

export function MovieDetails({
  id,
  revision,
  admin,
  onClose,
  onReview,
  onEdit,
  onDelete,
}: {
  id: string;
  revision: number;
  admin: boolean;
  onClose: () => void;
  onReview: (movie: MovieDetail) => void;
  onEdit: (movie: MovieDetail) => void;
  onDelete: (movie: MovieDetail) => void;
}) {
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviews, setReviews] = useState<ReviewPage | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getMovie(id, controller.signal)
      .then(setMovie)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => {
    const controller = new AbortController();
    listReviews(id, reviewPage, controller.signal)
      .then(setReviews)
      .catch((cause) => {
        if (!controller.signal.aborted) setReviewError(cause.message);
      });
    return () => controller.abort();
  }, [id, reviewPage, revision]);
  return (
    <Modal
      title={movie ? movieTitle(movie.titulo) : "Detalhes do filme"}
      onClose={onClose}
      wide
      className="movie-details-modal"
    >
      <ErrorText message={error} />
      {!movie && !error && (
        <p className="detail-status" role="status">
          Carregando detalhes...
        </p>
      )}
      {movie && (
        <>
          {movie.url_backdrop && (
            <div className="detail-backdrop">
              <img
                src={movie.url_backdrop}
                alt=""
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
            </div>
          )}
          <div className="detail-overview">
            <Poster
              src={movie.url_poster}
              title={movie.titulo}
              className="detail-poster"
            />
            <div className="detail-summary">
              <p className="detail-meta">
                {[
                  movie.data_lancamento
                    ? new Date(
                        `${movie.data_lancamento}T12:00:00`,
                      ).toLocaleDateString("pt-BR")
                    : movie.ano_lancamento,
                  ...movie.generos,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="detail-rating">
                <Rating
                  score={movie.media_avaliacoes}
                  count={movie.quantidade_avaliacoes}
                  showCount
                />
              </p>
              <div className="detail-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => onReview(movie)}
                >
                  Avaliar
                </button>
                {admin && (
                  <>
                    <button
                      className="btn btn-outline"
                      onClick={() => onEdit(movie)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-outline !text-danger"
                      onClick={() => onDelete(movie)}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
            <section className="detail-synopsis" aria-label="Sinopse">
              <h3 className="detail-section-title">Sinopse</h3>
              <p>{movie.sinopse || "Sem sinopse cadastrada."}</p>
            </section>
          </div>
          <section className="detail-section" aria-label="Ficha técnica">
            <h3 className="detail-section-title">Ficha técnica</h3>
            <dl className="detail-facts">
              <Facts label="Diretores" values={movie.diretores} />
              <Facts label="Atores" values={movie.atores} />
              <Facts label="Roteiristas" values={movie.roteiristas} />
              <Facts label="Produtoras" values={movie.produtoras} />
              {movie.duracao_minutos && (
                <Facts
                  label="Duração"
                  values={[`${movie.duracao_minutos} min`]}
                />
              )}
              {movie.status_filme && (
                <Facts label="Status" values={[movie.status_filme]} />
              )}
            </dl>
            {movie.desempenho && (
              <p className="detail-external-ratings">
                {movie.desempenho.nota_imdb !== null && (
                  <span>
                    IMDb{" "}
                    <strong className="text-gold">
                      {movie.desempenho.nota_imdb}
                    </strong>
                  </span>
                )}
                {movie.desempenho.nota_tmdb !== null && (
                  <span>
                    TMDB{" "}
                    <strong className="text-gold">
                      {movie.desempenho.nota_tmdb}
                    </strong>
                  </span>
                )}
                {movie.desempenho.popularidade !== null && (
                  <span>
                    Popularidade{" "}
                    <strong className="text-gold">
                      {movie.desempenho.popularidade}
                    </strong>
                  </span>
                )}
              </p>
            )}
          </section>
          <section
            className="detail-section"
            aria-label="Avaliações e resenhas"
          >
            <h3 className="detail-section-title">Avaliações e resenhas</h3>
            <ErrorText message={reviewError} />
            {!reviews && !reviewError && (
              <p className="detail-status" role="status">
                Carregando avaliações...
              </p>
            )}
            {reviews?.total === 0 && (
              <p className="detail-status">
                {movie.quantidade_avaliacoes > 0
                  ? "Nenhuma resenha individual disponível."
                  : "Nenhuma avaliação ainda. Seja o primeiro a avaliar este filme."}
              </p>
            )}
            {reviews?.items.map((review) => (
              <article
                key={review.sk_movie_review_id}
                className="detail-review"
              >
                <div className="detail-review-header">
                  <strong>{review.nome}</strong>
                  <Rating score={review.nota} count={1} />
                </div>
                <p className="detail-review-comment">{review.comentario}</p>
                <time
                  className="detail-review-date"
                  dateTime={review.created_at}
                >
                  {new Date(review.created_at).toLocaleDateString("pt-BR")}
                </time>
              </article>
            ))}
            {reviews && (
              <Pagination
                page={reviewPage}
                totalPages={reviews.total_pages}
                onPage={setReviewPage}
                label="Páginas das avaliações"
              />
            )}
          </section>
        </>
      )}
    </Modal>
  );
}
