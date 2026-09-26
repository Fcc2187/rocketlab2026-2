import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { movieTitle } from "../movieTitle";

export function Rating({
  score,
  count,
  showCount = false,
}: {
  score: number | null;
  count: number;
  showCount?: boolean;
}) {
  if (count === 0 || score === null)
    return <span className="text-muted">Sem avaliações</span>;
  const formatted = Number.isInteger(score)
    ? String(score)
    : score.toFixed(1).replace(".", ",");
  return (
    <span className="text-gold font-bold">
      {formatted} / 10
      {showCount && (
        <span className="ml-2 text-sm font-normal text-muted">
          · {count.toLocaleString("pt-BR")}{" "}
          {count === 1 ? "avaliação" : "avaliações"}
        </span>
      )}
    </span>
  );
}

export function Poster({
  src,
  title,
  className = "",
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const visibleTitle = movieTitle(title);
  return (
    <div className={`poster relative overflow-hidden rounded-lg ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={`Pôster de ${visibleTitle}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="poster-fallback absolute inset-0 flex flex-col justify-between p-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            CineRate
          </span>
          <span className="relative z-10 font-serif text-[clamp(1.25rem,2vw,2rem)] font-bold leading-tight break-words">
            {visibleTitle}
          </span>
          <span className="relative z-10 text-xs uppercase tracking-wider text-muted">
            Imagem indisponível
          </span>
        </div>
      )}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close();
      }}
      aria-label={title}
      className={`dialog ${wide ? "dialog-wide" : ""} ${className}`}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <h2 className="dialog-title">{title}</h2>
          <button
            type="button"
            className="btn btn-outline dialog-close"
            aria-label="Fechar"
            onClick={() => ref.current?.close()}
          >
            <svg
              width="18"
              height="18"
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
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
  label,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  label: string;
}) {
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => start + index,
  );
  return (
    <nav aria-label={label} className="pagination">
      <button
        className="btn btn-outline pagination-button"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        aria-label="Página anterior"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M19 12H5m6-6-6 6 6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {pages.map((value) => (
        <button
          key={value}
          className={`btn pagination-button ${value === page ? "btn-primary" : "btn-outline"}`}
          aria-current={value === page ? "page" : undefined}
          onClick={() => onPage(value)}
        >
          {value}
        </button>
      ))}
      <button
        className="btn btn-outline pagination-button"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Próxima página"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12h14m-6-6 6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </nav>
  );
}

export function ErrorText({
  message,
  autoFocus = false,
}: {
  message: string | null;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (autoFocus && message) ref.current?.focus();
  }, [autoFocus, message]);
  return (
    message && (
      <p
        ref={ref}
        tabIndex={autoFocus ? -1 : undefined}
        role="alert"
        className="form-error"
      >
        {message}
      </p>
    )
  );
}

export function SkeletonGrid() {
  return (
    <div
      className="movie-grid"
      aria-label="Carregando catálogo"
      aria-busy="true"
    >
      {Array.from({ length: 10 }, (_, index) => (
        <div
          key={index}
          className="movie-skeleton animate-pulse"
          aria-hidden="true"
        >
          <div className="skeleton-poster" />
          <div className="skeleton-title" />
          <div className="skeleton-meta" />
          <div className="skeleton-rating" />
          <div className="skeleton-button" />
        </div>
      ))}
    </div>
  );
}
