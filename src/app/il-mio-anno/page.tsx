"use client";

import { useState } from "react";
import { CategoryChart, MonthlyChart } from "@/components/Charts";
import { useData } from "@/components/DataProvider";
import { ComingSoon, PageHeader, Section, StatCard, StatGrid } from "@/components/ui";
import { monthlySeries, yearsWithData } from "@/lib/domain/finance";
import { formatEUR } from "@/lib/domain/money";
import { activeSubscriptionsAnnual, deltaPercent, yearReport } from "@/lib/domain/report";

const percent = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

function Rows({ items, empty }: { items: { label: string; value: number }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex justify-between gap-3">
          <span className="text-muted">{i.label}</span>
          <span className="font-medium tabular-nums">{formatEUR(i.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function IlMioAnnoPage() {
  const { db, today } = useData();
  const currentYear = Number(today.slice(0, 4));
  const years = [...new Set([currentYear, ...yearsWithData(db.movimenti)])].sort((a, b) => b - a);
  const [year, setYear] = useState(currentYear);

  const report = yearReport(db, year);
  const previous = yearReport(db, year - 1);
  const hasPrevious = previous.totals.entrate !== 0 || previous.totals.uscite !== 0;
  const t = report.totals;

  const compare = (current: number, prev: number) => {
    if (!hasPrevious) return `Nessun dato per il ${year - 1}`;
    const d = deltaPercent(current, prev);
    const change = d === null ? "" : ` (${d >= 0 ? "+" : ""}${percent(d)})`;
    return `${year - 1}: ${formatEUR(prev)}${change}`;
  };

  return (
    <>
      <PageHeader title="Il mio anno" description="Report annuale calcolato dai dati dei moduli.">
        <div className="flex items-center gap-2">
          <label htmlFor="anno" className="text-sm text-muted">Anno</label>
          <select id="anno" className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </PageHeader>

      {year === currentYear && (
        <p className="mb-4 text-sm text-muted">
          Anno in corso: il confronto è con l&apos;intero {year - 1}, quindi le variazioni diventano significative a fine anno.
        </p>
      )}

      <StatGrid>
        <StatCard label="Entrate" value={formatEUR(t.entrate)} hint={compare(t.entrate, previous.totals.entrate)} />
        <StatCard label="Uscite" value={formatEUR(t.uscite)} hint={compare(t.uscite, previous.totals.uscite)} />
        <StatCard label="Risparmio" value={formatEUR(t.risparmio)} tone={t.risparmio >= 0 ? "good" : "bad"}
          hint={compare(t.risparmio, previous.totals.risparmio)} />
        <StatCard label="Risparmio sulle entrate"
          value={report.tassoRisparmio === null ? "—" : percent(report.tassoRisparmio)}
          hint={hasPrevious && previous.tassoRisparmio !== null ? `${year - 1}: ${percent(previous.tassoRisparmio)}` : undefined} />
      </StatGrid>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Entrate e uscite mese per mese">
          <MonthlyChart data={monthlySeries(db.movimenti, year)} />
        </Section>
        <Section title="Spese per categoria">
          {report.categorie.length === 0
            ? <p className="text-sm text-muted">Nessuna spesa registrata.</p>
            : <CategoryChart data={report.categorie} />}
        </Section>
        <Section title="Spese per immobile">
          <Rows items={report.perImmobile.filter((i) => i.totale > 0).map((i) => ({ label: i.nome, value: i.totale }))} empty="Nessuna spesa registrata." />
        </Section>
        <Section title="Costi per veicolo">
          <Rows items={report.perVeicolo.filter((v) => v.totale > 0).map((v) => ({ label: v.nome, value: v.totale }))} empty="Nessun costo registrato." />
        </Section>
        <Section title="Altre voci">
          <Rows empty="" items={[
            { label: "Spese sanitarie", value: report.sanita },
            { label: "Versamenti in investimenti", value: t.investimenti },
            { label: "Abbonamenti oggi attivi (costo annuale)", value: activeSubscriptionsAnnual(db) },
          ]} />
        </Section>
        <Section title="Acquisti importanti">
          <Rows items={report.acquisti.map((a) => ({ label: a.nome, value: a.prezzo }))} empty="Nessun acquisto registrato in quest'anno." />
        </Section>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ComingSoon label="Report PDF" />
        <ComingSoon label="Esportazione CSV" />
        <ComingSoon label="Evoluzione del patrimonio" />
      </div>
    </>
  );
}
