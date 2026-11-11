"use client";

import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  label: string;
  align?: "right";
  /** Valore per l'ordinamento. */
  sort: (row: T) => string | number | null | undefined;
  /** Testo usato dalla ricerca. */
  text: (row: T) => string;
  render: (row: T) => ReactNode;
}

export interface TableFilter<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
}

interface Props<T> {
  rows: T[];
  columns: TableColumn<T>[];
  filters?: TableFilter<T>[];
  rowKey: (row: T) => string;
  defaultSort: { key: string; dir: "asc" | "desc" };
  initialSearch?: string;
  actions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  emptyText: string;
  emptyAction?: ReactNode;
}

const PAGE_SIZE = 25;
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function DataTable<T>({
  rows, columns, filters = [], rowKey, defaultSort, initialSearch = "", actions, toolbar, emptyText, emptyAction,
}: Props<T>) {
  const [search, setSearch] = useState(initialSearch);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(defaultSort);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const visible = useMemo(() => {
    const q = norm(search.trim());
    const filtered = rows.filter((row) => {
      for (const f of filters) {
        const value = filterValues[f.key];
        if (value && !f.match(row, value)) return false;
      }
      return !q || norm(columns.map((c) => c.text(row)).join(" ")).includes(q);
    });

    const column = columns.find((c) => c.key === sort.key);
    if (!column) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const x = column.sort(a);
      const y = column.sort(b);
      const missingX = x === null || x === undefined || x === "";
      const missingY = y === null || y === undefined || y === "";
      if (missingX || missingY) return missingX === missingY ? 0 : missingX ? 1 : -1; // vuoti sempre in fondo
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y), "it") * dir;
    });
  }, [rows, columns, filters, filterValues, search, sort]);

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const reset = () => {
    setSearch("");
    setFilterValues({});
  };

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-sm text-muted">{emptyText}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" aria-hidden />
          <input type="search" className="input pl-9" placeholder="Cerca…" aria-label="Cerca nella tabella"
            value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE_SIZE); }} />
        </div>
        {filters.map((f) => (
          <select key={f.key} className="input w-full sm:w-auto" aria-label={`Filtra per ${f.label}`}
            value={filterValues[f.key] ?? ""}
            onChange={(e) => { setFilterValues((v) => ({ ...v, [f.key]: e.target.value })); setLimit(PAGE_SIZE); }}>
            <option value="">{f.label}: tutti</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {toolbar}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-sm text-muted">Nessun risultato con questi filtri.</p>
          <button type="button" className="btn" onClick={reset}>Azzera filtri</button>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-left text-xs text-muted">
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-3 py-2 font-medium whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`}
                    aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex cursor-pointer items-center gap-1 hover:text-ink">
                      {c.label}
                      {sort.key === c.key && (sort.dir === "asc"
                        ? <ArrowUp className="size-3" aria-hidden />
                        : <ArrowDown className="size-3" aria-hidden />)}
                    </button>
                  </th>
                ))}
                {actions && <th scope="col" className="px-3 py-2"><span className="sr-only">Azioni</span></th>}
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, limit).map((row) => (
                <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right whitespace-nowrap tabular-nums" : ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                  {actions && <td className="px-3 py-1 text-right whitespace-nowrap">{actions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs text-muted">
          <span>{Math.min(limit, visible.length)} di {visible.length}</span>
          {visible.length > limit && (
            <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE_SIZE)}>Mostra altri</button>
          )}
        </div>
      )}
    </div>
  );
}
