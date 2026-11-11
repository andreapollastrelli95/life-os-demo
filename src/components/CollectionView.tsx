"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { deleteAction, rowAction } from "@/app/actions";
import { formatDate } from "@/lib/domain/dates";
import { formatEUR } from "@/lib/domain/money";
import type { CollectionKey, Db } from "@/lib/types";
import { COLLECTIONS } from "@/modules/collections";
import type { CellValue, Column, Field, Row } from "@/modules/engine";
import { useData } from "./DataProvider";
import { DataTable, type TableColumn, type TableFilter } from "./DataTable";
import { RecordForm } from "./RecordForm";
import { useToast } from "./Toast";
import { Badge, Modal, toneText } from "./ui";

function displayText(col: Column<Row>, value: CellValue): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (col.kind) {
    case "money": return formatEUR(value as number);
    case "date": return formatDate(value as string);
    case "number": return Number(value).toLocaleString("it-IT");
    case "percent": return `${String(value).replace(".", ",")}%`;
    default: return String(value);
  }
}

function buildColumn(col: Column<Row>, db: Db, today: string): TableColumn<Row> {
  const get = (r: Row): CellValue => (col.get ? col.get(r, db, today) : (r[col.key] as CellValue));
  return {
    key: col.key,
    label: col.label,
    align: col.kind === "money" || col.kind === "number" || col.kind === "percent" ? "right" : undefined,
    sort: get,
    text: (r) => displayText(col, get(r)),
    render: (r): ReactNode => {
      const value = get(r);
      const text = displayText(col, value);
      const tone = col.tone?.(value, r, today);
      if (col.kind === "badge") return text === "—" ? text : <Badge tone={tone}>{text}</Badge>;
      return <span className={tone && tone !== "neutral" ? `font-medium ${toneText(tone)}` : undefined}>{text}</span>;
    },
  };
}

function buildFilter(f: Field, db: Db): TableFilter<Row> {
  const options = f.type === "relation"
    ? (db[f.relation!] as unknown as Row[]).map((r) => ({ value: r.id, label: COLLECTIONS[f.relation!].label(r, db) }))
    : (f.options ?? []).map((o) => ({ value: o, label: o }));
  return {
    key: f.key,
    label: f.label,
    options,
    match: (row, value) => row[f.key] === value,
  };
}

interface Props {
  collection: CollectionKey;
  preset?: Record<string, string>;
  initialSearch?: string;
}

export function CollectionView({ collection, preset, initialSearch }: Props) {
  const { db, today } = useData();
  const notify = useToast();
  const config = COLLECTIONS[collection];
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const all = db[collection] as unknown as Row[];
    const entries = Object.entries(preset ?? {});
    return all.filter((r) => entries.every(([k, v]) => r[k] === v));
  }, [db, collection, preset]);

  const columns = useMemo(() => config.columns.map((c) => buildColumn(c, db, today)), [config, db, today]);
  const filters = useMemo(
    () => config.filters
      .filter((k) => !preset?.[k])
      .map((k) => buildFilter(config.fields.find((f) => f.key === k)!, db)),
    [config, db, preset],
  );

  const run = async (action: () => ReturnType<typeof deleteAction>, success: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) notify("success", success);
      else notify("error", result.error);
    } catch {
      notify("error", "Operazione non riuscita. Controlla che l'app sia in esecuzione e riprova.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    const row = deleting!;
    await run(() => deleteAction(collection, row.id), "Elemento eliminato");
    setDeleting(null);
  };

  const addButton = (
    <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
      <Plus className="size-4" aria-hidden /> Aggiungi
    </button>
  );

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        filters={filters}
        rowKey={(r) => r.id}
        defaultSort={config.defaultSort}
        initialSearch={initialSearch}
        toolbar={addButton}
        emptyText={`Non ci sono ancora ${config.plural}.`}
        emptyAction={addButton}
        actions={(row) => {
          const label = config.label(row, db);
          return (
            <>
              {config.rowActions?.filter((a) => a.visible(row)).map((a) => (
                <button key={a.id} type="button" className="btn-icon" title={a.label} aria-label={`${a.label}: ${label}`} disabled={busy}
                  onClick={() => run(() => rowAction(collection, row.id, a.id), a.success)}>
                  <Check className="size-4" aria-hidden />
                </button>
              ))}
              <button type="button" className="btn-icon" title="Modifica" aria-label={`Modifica ${label}`} onClick={() => setEditing(row)}>
                <Pencil className="size-4" aria-hidden />
              </button>
              <button type="button" className="btn-icon" title="Elimina" aria-label={`Elimina ${label}`} onClick={() => setDeleting(row)}>
                <Trash2 className="size-4" aria-hidden />
              </button>
            </>
          );
        }}
      />

      {editing && (
        <RecordForm key={editing === "new" ? "new" : editing.id} config={config}
          row={editing === "new" ? null : editing} preset={preset} onClose={() => setEditing(null)} />
      )}

      {deleting && (
        <Modal title="Conferma eliminazione" onClose={() => setDeleting(null)}>
          <p className="text-sm">Eliminare «{config.label(deleting, db)}»? L&apos;operazione non si può annullare.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setDeleting(null)}>Annulla</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={confirmDelete}>Elimina</button>
          </div>
        </Modal>
      )}
    </>
  );
}
