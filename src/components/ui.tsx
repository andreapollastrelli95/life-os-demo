"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { Tone } from "@/modules/engine";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  neutral: "text-ink",
};

const TONE_BADGE: Record<Tone, string> = {
  good: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  neutral: "bg-canvas text-muted",
};

export const toneText = (tone: Tone = "neutral") => TONE_TEXT[tone];

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_BADGE[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: Tone }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneText(tone)}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-night-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-night-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Etichetta informativa, non cliccabile: la funzione non esiste ancora. */
export function ComingSoon({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-line px-2 py-1 text-xs text-muted">
      {label}
      <span className="font-semibold text-night-700">Prossimamente</span>
    </span>
  );
}

export function ComingSoonRow({ labels }: { labels?: string[] }) {
  if (!labels?.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {labels.map((l) => <ComingSoon key={l} label={l} />)}
    </div>
  );
}

/** Finestra modale nativa: gestisce focus, tasto Esc e sfondo. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={ref} onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl bg-white p-0 text-ink shadow-xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-lg font-semibold text-night-900">{title}</h2>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Chiudi"><X className="size-4" aria-hidden /></button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
