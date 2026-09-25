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
          className="h-full w-full object-cover transition-transform duration-300"
        />
      ) : (
        <div className="poster-fallback absolute inset-0 flex flex-col justify-between p-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#d1e4db]">
            CineRate
          </span>
          <span className="relative z-10 font-serif text-[clamp(1.25rem,2vw,2rem)] font-bold leading-tight break-words">
            {visibleTitle}
          </span>
          <span className="relative z-10 text-xs uppercase tracking-wider text-[#b8c9c7]">
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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
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
      className={`dialog ${wide ? "dialog-wide" : ""}`}
    >
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-5">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            className="btn btn-outline !min-h-9 !px-3"
            aria-label="Fechar"
            onClick={() => ref.current?.close()}
          >
            ×
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
    <nav
      aria-label={label}
      className="mt-7 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        className="btn btn-outline !px-3"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        aria-label="Página anterior"
      >
        ←
      </button>
      {pages.map((value) => (
        <button
          key={value}
          className={`btn !px-3 ${value === page ? "btn-primary" : "btn-outline"}`}
          aria-current={value === page ? "page" : undefined}
          onClick={() => onPage(value)}
        >
          {value}
        </button>
      ))}
      <button
        className="btn btn-outline !px-3"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Próxima página"
      >
        →
      </button>
    </nav>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  return (
    message && (
      <p
        role="alert"
        className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm text-[#ffd5d7]"
      >
        {message}
      </p>
    )
  );
}

export function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      aria-label="Carregando catálogo"
    >
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="animate-pulse">
          <div className="poster rounded-lg bg-surface2" />
          <div className="mt-3 h-4 w-4/5 rounded bg-surface2" />
          <div className="mt-2 h-3 w-2/3 rounded bg-surface2" />
        </div>
      ))}
    </div>
  );
}
