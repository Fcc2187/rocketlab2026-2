import type { MovieListItem } from '../api/types'
import { movieTitle } from '../movieTitle'
import { Poster, Rating } from './ui'

export function MovieCard({ movie, admin, onDetails, onReview, onEdit, onDelete }: {
  movie: MovieListItem; admin: boolean
  onDetails: () => void; onReview: () => void; onEdit: () => void; onDelete: () => void
}) {
  const title = movieTitle(movie.titulo)
  return <article className="movie-card group relative flex h-full min-w-0 flex-col">
    {admin && <details className="absolute right-2 top-2 z-10 rounded-lg bg-bg/90 text-sm shadow-lg [&_summary]:list-none">
      <summary className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-xl focus-visible:outline-2 focus-visible:outline-accent" aria-label={`Opções para ${title}`}>⋯</summary>
      <div className="absolute right-0 mt-1 grid w-40 rounded-lg border border-line bg-surface p-1 shadow-xl">
        <button className="rounded px-3 py-2 text-left hover:bg-surface2" onClick={onDetails}>Ver detalhes</button>
        <button className="rounded px-3 py-2 text-left hover:bg-surface2" onClick={onEdit}>Editar</button>
        <button className="rounded px-3 py-2 text-left text-danger hover:bg-surface2" onClick={onDelete}>Excluir</button>
      </div>
    </details>}
    <button type="button" onClick={onDetails} className="block w-full text-left" aria-label={`Ver detalhes de ${title}`}><Poster src={movie.url_poster} title={title} /></button>
    <div className="mt-3 flex flex-1 flex-col"><button className="line-clamp-2 min-h-11 text-left text-base font-bold leading-snug hover:text-accent" onClick={onDetails}>{title}</button>
      <p className="mt-1 line-clamp-1 text-sm text-muted">{movie.ano_lancamento ?? 'Ano não informado'}{movie.generos.length > 0 && ` · ${movie.generos.slice(0, 2).join(' · ')}`}</p>
      <p className="mb-3 mt-2 text-sm"><Rating score={movie.media_avaliacoes} count={movie.quantidade_avaliacoes} /></p>
      <button type="button" className="btn btn-outline mt-auto w-full" onClick={onReview}>Avaliar</button>
    </div>
  </article>
}
