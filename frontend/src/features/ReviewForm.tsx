import { useState } from 'react'
import { createReview } from '../api/reviews'
import { ErrorText, Modal } from '../components/ui'
import { movieTitle } from '../movieTitle'

export function ReviewForm({ id, title, onClose, onSaved }: { id: string; title: string; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nome = String(data.get('nome') || '').trim()
    const comentario = String(data.get('comentario') || '').trim()
    const nota = Number(String(data.get('nota')).replace(',', '.'))
    if (!nome || !comentario || !Number.isFinite(nota) || nota < 0 || nota > 10) { setError('Preencha nome, nota de 0 a 10 e comentário.'); return }
    setBusy(true); setError(null)
    try { await createReview(id, { nome, nota, comentario }); onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível publicar a avaliação.') }
    finally { setBusy(false) }
  }
  return <Modal title="Nova avaliação" onClose={onClose}>
    <p className="mb-5 text-sm text-muted">Filme: {movieTitle(title)}</p>
    <form onSubmit={submit} className="grid gap-4">
      <label className="field">Seu nome<input className="input" name="nome" required maxLength={120} autoFocus /></label>
      <label className="field">Sua nota / 10<input className="input" name="nota" type="number" min="0" max="10" step="any" inputMode="decimal" required placeholder="8.5" /></label>
      <p className="-mt-2 text-sm text-muted">Use uma nota de 0 a 10. Decimais são aceitos.</p>
      <label className="field">Comentário<textarea className="input" name="comentario" required maxLength={4000} /></label>
      <ErrorText message={error} />
      <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Publicando...' : 'Publicar avaliação'}</button></div>
    </form>
  </Modal>
}
