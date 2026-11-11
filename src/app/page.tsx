"use client";

import Link from "next/link";
import { CategoryChart, MonthlyChart } from "@/components/Charts";
import { useData } from "@/components/DataProvider";
import { dueLabel } from "@/components/Notifications";
import { UploadCard } from "@/components/UploadCard";
import { Badge, PageHeader, Section, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/domain/dates";
import { collectDeadlines } from "@/lib/domain/deadlines";
import { computeTotals, expensesByCategory, monthlySeries, movementsInYear } from "@/lib/domain/finance";
import { formatEUR } from "@/lib/domain/money";
import { computeNetWorth } from "@/lib/domain/networth";
import { isDemo } from "@/lib/types";

export default function DashboardPage() {
  const { db, today } = useData();
  const year = Number(today.slice(0, 4));
  const movimenti = movementsInYear(db.movimenti, year, today);
  const totals = computeTotals(movimenti);
  const net = computeNetWorth(db, today);
  const categorie = expensesByCategory(movimenti);
  const prossime = collectDeadlines(db, today).filter((d) => d.giorni >= -30).slice(0, 7);
  const ultimi = [...db.movimenti]
    .filter((m) => m.data <= today)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" description={`Situazione al ${formatDate(today)}. Tutti i valori sono calcolati dai ${isDemo(db) ? "dati demo" : "tuoi dati"}.`} />

      <div className="mb-4">
        <UploadCard />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Patrimonio netto" value={formatEUR(net.netto)} tone={net.netto >= 0 ? "good" : "bad"} />
        <StatCard label="Liquidità" value={formatEUR(net.liquidita)} />
        <StatCard label={`Entrate ${year}`} value={formatEUR(totals.entrate)} />
        <StatCard label={`Uscite ${year}`} value={formatEUR(totals.uscite)} />
        <StatCard label={`Risparmio ${year}`} value={formatEUR(totals.risparmio)} tone={totals.risparmio >= 0 ? "good" : "bad"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title={`Entrate e uscite mensili ${year}`}>
          <MonthlyChart data={monthlySeries(movimenti, year)} />
        </Section>
        <Section title={`Spese per categoria ${year}`}>
          {categorie.length === 0
            ? <p className="text-sm text-muted">Nessuna spesa registrata quest&apos;anno.</p>
            : <CategoryChart data={categorie} />}
        </Section>

        <Section title="Prossime scadenze" action={<Link href="/scadenziario" className="text-sm font-medium text-accent hover:underline">Vedi tutte</Link>}>
          {prossime.length === 0 ? <p className="text-sm text-muted">Nessuna scadenza.</p> : (
            <ul className="divide-y divide-line">
              {prossime.map((d) => (
                <li key={d.id}>
                  <Link href={d.href} className="flex items-center justify-between gap-3 py-2 hover:text-accent">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.titolo}</span>
                      <span className="block text-xs text-muted">{d.tipo} · {formatDate(d.data)}</span>
                    </span>
                    <Badge tone={d.giorni < 0 ? "bad" : d.giorni <= 30 ? "warn" : "neutral"}>{dueLabel(d.giorni)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Ultime operazioni" action={<Link href="/finanze" className="text-sm font-medium text-accent hover:underline">Vedi tutte</Link>}>
          {ultimi.length === 0 ? <p className="text-sm text-muted">Nessun movimento.</p> : (
            <ul className="divide-y divide-line">
              {ultimi.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{m.descrizione}</span>
                    <span className="block text-xs text-muted">{m.tipo} · {formatDate(m.data)}</span>
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap tabular-nums">{formatEUR(m.importo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
