"use client";

import { Download, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteAllegatoAction } from "@/app/actions";
import { openAllegato } from "@/lib/data/allegati";
import { formatDate } from "@/lib/domain/dates";
import { destinazioneLabel, formatBytes } from "@/lib/destinazioni";
import type { Allegato } from "@/lib/types";
import { COLLECTIONS } from "@/modules/collections";
import type { Row } from "@/modules/engine";
import { useData } from "./DataProvider";
import { useToast } from "./Toast";
import { Badge, Modal } from "./ui";

/** Elenco di file caricati: apertura, download ed eliminazione. */
export function AllegatiList({ items, showDestinazione = false, emptyText }: {
  items: Allegato[];
  showDestinazione?: boolean;
  emptyText: string;
}) {
  const { db } = useData();
  const notify = useToast();
  const [deleting, setDeleting] = useState<Allegato | null>(null);
  const [busy, setBusy] = useState(false);

  const linked = (a: Allegato): string | null => {
    if (!a.collezione || !a.recordId) return null;
    const row = (db[a.collezione] as unknown as Row[]).find((r) => r.id === a.recordId);
    return row ? COLLECTIONS[a.collezione].label(row, db) : null;
  };

  const open = async (a: Allegato, download: boolean) => {
    try {
      await openAllegato(a, download);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Apertura non riuscita.");
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      const result = await deleteAllegatoAction(deleting!.id);
      if (result.ok) notify("success", "File eliminato");
      else notify("error", result.error);
    } catch {
      notify("error", "Eliminazione non riuscita. Riprova.");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  if (items.length === 0) return <p className="text-sm text-muted">{emptyText}</p>;

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((a) => {
          const Icon = a.mime.startsWith("image/") ? ImageIcon : FileText;
          const record = linked(a);
          return (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <Icon className="size-4 shrink-0 text-muted" aria-hidden />
              <button type="button" onClick={() => open(a, false)} className="min-w-0 flex-1 cursor-pointer text-left hover:text-accent">
                <span className="block truncate text-sm font-medium">{a.titolo}</span>
                <span className="block truncate text-xs text-muted">
                  {a.nome} · {formatBytes(a.dimensione)} · {formatDate(a.createdAt.slice(0, 10))}
                  {record && record !== a.titolo ? ` · ${record}` : ""}
                </span>
              </button>
              {showDestinazione && <Badge>{destinazioneLabel(a.destinazione)}</Badge>}
              <button type="button" onClick={() => open(a, true)} className="btn-icon" title="Scarica" aria-label={`Scarica ${a.titolo}`}>
                <Download className="size-4" aria-hidden />
              </button>
              <button type="button" className="btn-icon" title="Elimina" aria-label={`Elimina ${a.titolo}`} onClick={() => setDeleting(a)}>
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      {deleting && (
        <Modal title="Conferma eliminazione" onClose={() => setDeleting(null)}>
          <p className="text-sm">Eliminare il file «{deleting.titolo}»? L&apos;operazione non si può annullare.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setDeleting(null)}>Annulla</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={confirmDelete}>Elimina</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export const byNewest = (a: Allegato, b: Allegato) => b.createdAt.localeCompare(a.createdAt) || a.titolo.localeCompare(b.titolo);
