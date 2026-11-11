"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { COLLECTION_KEYS } from "@/lib/types";
import { COLLECTIONS } from "@/modules/collections";
import type { Row } from "@/modules/engine";
import { locateCollection } from "@/modules/pages";
import { useData } from "./DataProvider";
import { NAV } from "./nav";

interface Hit {
  key: string;
  title: string;
  where: string;
  href: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const MAX_HITS = 12;

export function GlobalSearch() {
  const { db } = useData();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const hits = useMemo<Hit[]>(() => {
    const q = norm(query.trim());
    if (q.length < 2) return [];
    const out: Hit[] = [];

    for (const { items } of NAV)
      for (const item of items)
        if (norm(item.label).includes(q))
          out.push({ key: item.href, title: item.label, where: "Pagina", href: item.href });

    for (const key of COLLECTION_KEYS) {
      const config = COLLECTIONS[key];
      const { def, tab } = locateCollection(key);
      for (const row of db[key] as unknown as Row[]) {
        const text = config.fields
          .filter((f) => f.type !== "money" && f.type !== "relation")
          .map((f) => row[f.key])
          .filter((v) => typeof v === "string")
          .join(" ");
        const label = config.label(row, db);
        if (!norm(`${label} ${text}`).includes(q)) continue;
        out.push({
          key: `${key}-${row.id}`,
          title: label,
          where: `${def.title} · ${tab.label}`,
          href: `/${def.slug}?tab=${tab.id}&q=${encodeURIComponent(label)}`,
        });
      }
    }
    return out;
  }, [db, query]);

  const shown = hits.slice(0, MAX_HITS);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1 sm:max-w-md"
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget)) setOpen(false); }}>
      <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" aria-hidden />
      <input type="search" value={query} placeholder="Cerca in tutti i moduli…" aria-label="Ricerca globale"
        className="input pl-9" autoComplete="off"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { close(); e.currentTarget.blur(); }
          if (e.key === "Enter" && shown[0]) { router.push(shown[0].href); close(); }
        }} />
      {open && query.trim().length >= 2 && (
        <div className="card absolute top-11 right-0 left-0 z-30 max-h-96 overflow-y-auto p-1 shadow-lg sm:right-auto sm:w-[28rem]">
          {shown.length === 0 && <p className="px-3 py-4 text-sm text-muted">Nessun risultato per «{query.trim()}».</p>}
          {shown.map((h) => (
            <Link key={h.key} href={h.href} onClick={close} className="block rounded-lg px-3 py-2 hover:bg-canvas">
              <span className="block truncate text-sm font-medium">{h.title}</span>
              <span className="block truncate text-xs text-muted">{h.where}</span>
            </Link>
          ))}
          {hits.length > MAX_HITS && (
            <p className="px-3 py-2 text-xs text-muted">Altri {hits.length - MAX_HITS} risultati: affina la ricerca.</p>
          )}
        </div>
      )}
    </div>
  );
}
