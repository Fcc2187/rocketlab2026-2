import { useEffect, useState } from "react";
import { getMovie } from "../api/movies";
import { listReviews } from "../api/reviews";
import type { MovieDetail, ReviewPage } from "../api/types";
import { ErrorText, Modal, Pagination, Poster, Rating } from "../components/ui";
import { movieTitle } from "../movieTitle";

function Facts({ label, values }: { label: string; values: string[] }) {
  return (
    values.length > 0 && (
      <div>
        <dt className="text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </dt>
        <dd className="mt-1 text-sm">{values.join(", ")}</dd>
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
    >
      <ErrorText message={error} />
      {!movie && !error && <p className="text-muted">Carregando detalhes...</p>}
      {movie && (
        <>
          <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
            <Poster
              src={movie.url_poster}
              title={movie.titulo}
              className="mx-auto w-40 sm:w-full"
            />
            <div>
              <p className="text-sm text-muted">
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
              <p className="mt-3">
                <Rating
                  score={movie.media_avaliacoes}
                  count={movie.quantidade_avaliacoes}
                  showCount
                />
              </p>
              <p className="mt-4 text-sm leading-7 text-[#c6d2d0]">
                {movie.sinopse || "Sem sinopse cadastrada."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
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
              <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
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
                <p className="mt-5 flex flex-wrap gap-3 text-sm text-muted">
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
            </div>
          </div>
          <section className="mt-8 border-t border-line pt-6">
            <h3 className="text-lg font-bold">Avaliações e resenhas</h3>
            <ErrorText message={reviewError} />
            {!reviews && !reviewError && (
              <p className="mt-4 text-muted">Carregando avaliações...</p>
            )}
            {reviews?.total === 0 && (
              <p className="mt-4 text-sm text-muted">
                {movie.quantidade_avaliacoes > 0
                  ? "Nenhuma resenha individual disponível."
                  : "Nenhuma avaliação ainda. Seja o primeiro a avaliar este filme."}
              </p>
            )}
            {reviews?.items.map((review) => (
              <article
                key={review.sk_movie_review_id}
                className="border-b border-line py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{review.nome}</strong>
                  <Rating score={review.nota} count={1} />
                </div>
                <p className="mt-2 text-sm text-[#c6d2d0]">
                  {review.comentario}
                </p>
                <time
                  className="mt-2 block text-xs text-muted"
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
