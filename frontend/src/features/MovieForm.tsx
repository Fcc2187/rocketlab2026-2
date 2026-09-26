import { useEffect, useState } from "react";
import { createMovie, getMovie, patchMovie } from "../api/movies";
import { ApiError } from "../api/client";
import type { MovieCreate, MovieDetail, MoviePatch } from "../api/types";
import { ErrorText, Modal } from "../components/ui";

function Chips({
  label,
  names,
  setNames,
  maxLength,
}: {
  label: string;
  names: string[];
  setNames: (names: string[]) => void;
  maxLength: number;
}) {
  const [input, setInput] = useState("");
  function add() {
    const name = input.trim();
    if (
      name &&
      !names.some(
        (value) =>
          value.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
      )
    )
      setNames([...names, name]);
    setInput("");
  }
  return (
    <fieldset className="field chip-field">
      <legend>{label}</legend>
      <div className="chip-control">
        {names.length > 0 && (
          <div className="chip-list">
            {names.map((name) => (
              <span key={name} className="chip">
                <span>{name}</span>
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Remover ${name}`}
                  onClick={() =>
                    setNames(names.filter((value) => value !== name))
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m6 6 12 12M6 18 18 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="chip-entry">
          <input
            className="input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            maxLength={maxLength}
            aria-label={`Novo ${label.toLowerCase()}`}
          />
          <button type="button" className="btn btn-outline" onClick={add}>
            Adicionar
          </button>
        </div>
      </div>
    </fieldset>
  );
}

export function MovieForm({
  id,
  token,
  onClose,
  onSaved,
  onUnauthorized,
}: {
  id: string | null;
  token: string;
  onClose: () => void;
  onSaved: (movie: MovieDetail) => void;
  onUnauthorized: () => void;
}) {
  const [original, setOriginal] = useState<MovieDetail | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState("");
  const [poster, setPoster] = useState("");
  const [backdrop, setBackdrop] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [directors, setDirectors] = useState<string[]>([]);
  const [actors, setActors] = useState<string[]>([]);
  const [writers, setWriters] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    getMovie(id, controller.signal)
      .then((movie) => {
        setOriginal(movie);
        setTitle(movie.titulo);
        setYear(movie.ano_lancamento?.toString() || "");
        setReleaseDate(movie.data_lancamento || "");
        setDuration(movie.duracao_minutos?.toString() || "");
        setStatus(movie.status_filme || "");
        setPoster(movie.url_poster || "");
        setBackdrop(movie.url_backdrop || "");
        setSynopsis(movie.sinopse || "");
        setGenres(movie.generos);
        setDirectors(movie.diretores);
        setActors(movie.atores);
        setWriters(movie.roteiristas);
        setCompanies(movie.produtoras);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: MovieCreate = {
      titulo: title.trim(),
      ano_lancamento: year ? Number(year) : null,
      data_lancamento: releaseDate || null,
      duracao_minutos: duration ? Number(duration) : null,
      status_filme: status.trim() || null,
      url_poster: poster.trim() || null,
      url_backdrop: backdrop.trim() || null,
      sinopse: synopsis.trim() || null,
      generos: genres,
      diretores: directors,
      atores: actors,
      roteiristas: writers,
      produtoras: companies,
    };
    if (!payload.titulo) {
      setError("Informe o título do filme.");
      return;
    }
    const patch: MoviePatch = {};
    if (original) {
      for (const key of Object.keys(payload) as (keyof MovieCreate)[]) {
        if (JSON.stringify(payload[key]) !== JSON.stringify(original[key]))
          Object.assign(patch, { [key]: payload[key] });
      }
    }
    setBusy(true);
    setError(null);
    try {
      const saved = id
        ? await patchMovie(id, patch, token)
        : await createMovie(payload, token);
      onSaved(saved);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível salvar o filme.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={id ? "Editar filme" : "Adicionar filme"}
      onClose={onClose}
      className="admin-modal"
    >
      {loading ? (
        <p className="form-description" role="status">
          Carregando filme...
        </p>
      ) : (
        <form onSubmit={submit} className="admin-form" aria-busy={busy}>
          <p className="form-description">Somente o título é obrigatório.</p>
          <label className="field">
            Título
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={500}
              required
              autoFocus
              ref={(input) => {
                if (input) input.autofocus = true;
              }}
            />
          </label>
          <label className="field">
            Ano de lançamento
            <input
              className="input"
              type="number"
              min="1"
              max="9999"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </label>
          <label className="field">
            Data de lançamento
            <input
              className="input"
              type="date"
              max="9999-12-31"
              min="0001-01-01"
              value={releaseDate}
              onChange={(event) => {
                setReleaseDate(event.target.value);
                if (event.target.value) setYear(event.target.value.slice(0, 4));
              }}
            />
          </label>
          <label className="field">
            Duração (minutos)
            <input
              className="input"
              type="number"
              min="0"
              max="2147483647"
              step="1"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
          <label className="field">
            Status
            <input
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              maxLength={50}
              placeholder="Ex.: Lançado, em produção"
            />
          </label>
          <label className="field">
            URL do pôster
            <input
              className="input"
              type="url"
              pattern="https?://.+"
              value={poster}
              onChange={(event) => setPoster(event.target.value)}
              maxLength={2048}
              placeholder="https://..."
            />
          </label>
          <label className="field">
            URL do backdrop
            <input
              className="input"
              type="url"
              pattern="https?://.+"
              value={backdrop}
              onChange={(event) => setBackdrop(event.target.value)}
              maxLength={2048}
              placeholder="https://..."
            />
          </label>
          <Chips
            label="Gêneros"
            names={genres}
            setNames={setGenres}
            maxLength={50}
          />
          <Chips
            label="Diretores"
            names={directors}
            setNames={setDirectors}
            maxLength={255}
          />
          <label className="field">
            Sinopse
            <textarea
              className="input"
              value={synopsis}
              onChange={(event) => setSynopsis(event.target.value)}
              maxLength={4000}
            />
          </label>
          <Chips
            label="Elenco"
            names={actors}
            setNames={setActors}
            maxLength={255}
          />
          <Chips
            label="Roteiristas"
            names={writers}
            setNames={setWriters}
            maxLength={255}
          />
          <Chips
            label="Produtoras"
            names={companies}
            setNames={setCompanies}
            maxLength={255}
          />
          <ErrorText message={error} autoFocus />
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={busy}>
              {busy
                ? "Salvando..."
                : id
                  ? "Salvar alterações"
                  : "Adicionar filme"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
