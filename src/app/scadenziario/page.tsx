"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { DataTable, type TableColumn, type TableFilter } from "@/components/DataTable";
import { dueLabel } from "@/components/Notifications";
import { Badge, PageHeader, StatCard, StatGrid } from "@/components/ui";
import { formatDate } from "@/lib/domain/dates";
import { collectDeadlines, type Deadline } from "@/lib/domain/deadlines";
import type { Tone } from "@/modules/engine";

const STATI: Deadline["stato"][] = ["Scaduta", "Entro 30 giorni", "Entro 90 giorni", "Più avanti"];
const TONI: Record<Deadline["stato"], Tone> = {
  Scaduta: "bad", "Entro 30 giorni": "warn", "Entro 90 giorni": "neutral", "Più avanti": "neutral",
};

const columns: TableColumn<Deadline>[] = [
  { key: "data", label: "Data", sort: (d) => d.data, text: (d) => formatDate(d.data), render: (d) => formatDate(d.data) },
  {
    key: "titolo", label: "Scadenza", sort: (d) => d.titolo, text: (d) => d.titolo,
    render: (d) => <Link href={d.href} className="font-medium hover:text-accent hover:underline">{d.titolo}</Link>,
  },
  { key: "tipo", label: "Tipo", sort: (d) => d.tipo, text: (d) => d.tipo, render: (d) => d.tipo },
  { key: "modulo", label: "Modulo", sort: (d) => d.modulo, text: (d) => d.modulo, render: (d) => d.modulo },
  {
    key: "stato", label: "Stato", sort: (d) => d.giorni, text: (d) => d.stato,
    render: (d) => <Badge tone={TONI[d.stato]}>{dueLabel(d.giorni)}</Badge>,
  },
];

export default function ScadenziarioPage() {
  const { db, today } = useData();
  const deadlines = useMemo(() => collectDeadlines(db, today), [db, today]);

  const filters = useMemo<TableFilter<Deadline>[]>(() => [
    {
      key: "modulo", label: "Modulo",
      options: [...new Set(deadlines.map((d) => d.modulo))].sort().map((m) => ({ value: m, label: m })),
      match: (d, v) => d.modulo === v,
    },
    {
      key: "stato", label: "Stato",
      options: STATI.map((s) => ({ value: s, label: s })),
      match: (d, v) => d.stato === v,
    },
  ], [deadlines]);

  const count = (s: Deadline["stato"]) => deadlines.filter((d) => d.stato === s).length;

  return (
    <>
      <PageHeader title="Scadenziario" description="Vista unica delle date di tutti i moduli. Si modificano dal modulo di origine." />
      <div className="mb-5">
        <StatGrid>
          <StatCard label="Scadute" value={String(count("Scaduta"))} tone="bad" />
          <StatCard label="Entro 30 giorni" value={String(count("Entro 30 giorni"))} tone="warn" />
          <StatCard label="Entro 90 giorni" value={String(count("Entro 90 giorni"))} />
          <StatCard label="Totale" value={String(deadlines.length)} />
        </StatGrid>
      </div>
      <DataTable rows={deadlines} columns={columns} filters={filters} rowKey={(d) => d.id}
        defaultSort={{ key: "data", dir: "asc" }} emptyText="Nessuna scadenza nei moduli." />
    </>
  );
}
