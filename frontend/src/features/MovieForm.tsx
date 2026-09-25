import { useEffect, useState } from 'react'
import { createMovie, getMovie, patchMovie } from '../api/movies'
import { ApiError } from '../api/client'
import type { MovieCreate, MovieDetail, MoviePatch } from '../api/types'
import { ErrorText, Modal } from '../components/ui'

function Chips({ label, names, setNames, maxLength }: { label: string; names: string[]; setNames: (names: string[]) => void; maxLength: number }) {
  const [input, setInput] = useState('')
  function add() {
    const name = input.trim()
    if (name && !names.some(value => value.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) setNames([...names, name])
    setInput('')
  }
  return <div className="field"><span>{label}</span><div className="rounded-lg border border-line bg-[#10181c] p-2">
    <div className="flex flex-wrap gap-2">{names.map(name => <span key={name} className="inline-flex items-center gap-2 rounded-full bg-[#173b30] px-3 py-1 text-sm text-[#d8f4e3]">{name}<button type="button" aria-label={`Remover ${name}`} onClick={() => setNames(names.filter(value => value !== name))}>×</button></span>)}</div>
    <div className="mt-2 flex gap-2"><input className="input" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add() } }} maxLength={maxLength} aria-label={`Novo ${label.toLowerCase()}`} /><button type="button" className="btn btn-outline" onClick={add}>Adicionar</button></div>
  </div></div>
}

export function MovieForm({ id, token, onClose, onSaved, onUnauthorized }: { id: string | null; token: string; onClose: () => void; onSaved: (movie: MovieDetail) => void; onUnauthorized: () => void }) {
  const [original, setOriginal] = useState<MovieDetail | null>(null)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [directors, setDirectors] = useState<string[]>([])
  const [loading, setLoading] = useState(Boolean(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    getMovie(id, controller.signal).then(movie => { setOriginal(movie); setTitle(movie.titulo); setYear(movie.ano_lancamento?.toString() || ''); setSynopsis(movie.sinopse || ''); setGenres(movie.generos); setDirectors(movie.diretores) }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id])
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload: MovieCreate = { titulo: title.trim(), ano_lancamento: year ? Number(year) : null, sinopse: synopsis.trim() || null, generos: genres, diretores: directors }
    if (!payload.titulo) { setError('Informe o título do filme.'); return }
    const patch: MoviePatch = {}
    if (original) {
      if (payload.titulo !== original.titulo) patch.titulo = payload.titulo
      if (payload.ano_lancamento !== original.ano_lancamento) patch.ano_lancamento = payload.ano_lancamento
      if (payload.sinopse !== original.sinopse) patch.sinopse = payload.sinopse
      if (JSON.stringify(payload.generos) !== JSON.stringify(original.generos)) patch.generos = payload.generos
      if (JSON.stringify(payload.diretores) !== JSON.stringify(original.diretores)) patch.diretores = payload.diretores
    }
    setBusy(true); setError(null)
    try { const saved = id ? await patchMovie(id, patch, token) : await createMovie(payload, token); onSaved(saved) }
    catch (cause) { if (cause instanceof ApiError && cause.status === 401) onUnauthorized(); else setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o filme.') }
    finally { setBusy(false) }
  }
  return <Modal title={id ? 'Editar filme' : 'Adicionar filme'} onClose={onClose}>
    {loading ? <p className="text-muted">Carregando filme...</p> : <form onSubmit={submit} className="grid gap-4">
      <label className="field">Título<input className="input" value={title} onChange={event => setTitle(event.target.value)} maxLength={500} required autoFocus /></label>
      <label className="field">Ano de lançamento<input className="input" type="number" min="1" max="9999" value={year} onChange={event => setYear(event.target.value)} /></label>
      <Chips label="Gêneros" names={genres} setNames={setGenres} maxLength={50} />
      <Chips label="Diretores" names={directors} setNames={setDirectors} maxLength={255} />
      <label className="field">Sinopse<textarea className="input" value={synopsis} onChange={event => setSynopsis(event.target.value)} maxLength={4000} /></label>
      <ErrorText message={error} />
      <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando...' : id ? 'Salvar alterações' : 'Adicionar filme'}</button></div>
    </form>}
  </Modal>
}
