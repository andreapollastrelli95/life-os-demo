"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/domain/dates";
import { collectDeadlines, notificationsFrom } from "@/lib/domain/deadlines";
import { useData } from "./DataProvider";
import { Badge } from "./ui";

export function dueLabel(giorni: number): string {
  if (giorni < 0) return `Scaduta da ${-giorni} ${giorni === -1 ? "giorno" : "giorni"}`;
  if (giorni === 0) return "Oggi";
  if (giorni === 1) return "Domani";
  return `Tra ${giorni} giorni`;
}

export function Notifications() {
  const { db, today } = useData();
  const [open, setOpen] = useState(false);
  const items = useMemo(() => notificationsFrom(collectDeadlines(db, today)), [db, today]);

  return (
    <div className="relative shrink-0" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <button type="button" className="btn-icon relative" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-label={`Notifiche: ${items.length} scadenze entro 30 giorni`}>
        <Bell className="size-5" aria-hidden />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Chiudi notifiche" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div className="card fixed top-24 right-3 left-3 z-30 flex max-h-[28rem] flex-col shadow-lg sm:absolute sm:top-10 sm:right-0 sm:left-auto sm:w-96">
            <div className="border-b border-line px-4 py-2.5">
              <p className="text-sm font-semibold text-night-900">Notifiche</p>
              <p className="text-xs text-muted">Scadute o in arrivo entro 30 giorni</p>
            </div>
            <ul className="flex-1 overflow-y-auto p-1">
              {items.length === 0 && <li className="px-3 py-4 text-sm text-muted">Nessuna scadenza imminente.</li>}
              {items.map((d) => (
                <li key={d.id}>
                  <Link href={d.href} onClick={() => setOpen(false)} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-canvas">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.titolo}</span>
                      <span className="block text-xs text-muted">{d.tipo} · {formatDate(d.data)}</span>
                    </span>
                    <Badge tone={d.giorni < 0 ? "bad" : "warn"}>{dueLabel(d.giorni)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/scadenziario" onClick={() => setOpen(false)} className="border-t border-line px-4 py-2.5 text-sm font-medium text-accent hover:underline">
              Apri lo scadenziario
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
