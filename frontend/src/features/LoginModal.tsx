import { useState } from 'react'
import { login } from '../api/auth'
import { ErrorText, Modal } from '../components/ui'

export function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: (token: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true); setError(null)
    try { const result = await login(String(data.get('username')), String(data.get('password'))); onLogin(result.access_token) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar. Tente novamente.') }
    finally { setBusy(false) }
  }
  return <Modal title="Entrar como administrador" onClose={onClose}>
    <p className="mb-5 text-sm text-muted">Entre para gerenciar o catálogo.</p>
    <form onSubmit={submit} className="grid gap-4">
      <label className="field">Usuário<input className="input" name="username" autoComplete="username" required maxLength={120} autoFocus /></label>
      <label className="field">Senha<input className="input" type="password" name="password" autoComplete="current-password" required /></label>
      <ErrorText message={error} />
      <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button></div>
    </form>
  </Modal>
}
