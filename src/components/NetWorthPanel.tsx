"use client";

import { formatEUR } from "@/lib/domain/money";
import { computeNetWorth } from "@/lib/domain/networth";
import { useData } from "./DataProvider";
import { Section, StatCard } from "./ui";

function Lines({ items }: { items: [string, number][] }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium tabular-nums">{formatEUR(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function NetWorthPanel() {
  const { db, today } = useData();
  const n = computeNetWorth(db, today);

  return (
    <div className="mb-5 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Attività" value={formatEUR(n.attivita)} />
        <StatCard label="Passività" value={formatEUR(n.passivita)} />
        <StatCard label="Patrimonio netto" value={formatEUR(n.netto)} tone={n.netto >= 0 ? "good" : "bad"} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Composizione delle attività">
          <Lines items={[
            ["Liquidità (saldi positivi dei conti)", n.liquidita],
            ["Investimenti", n.investimenti],
            ["Immobili (quota di proprietà)", n.immobili],
            ["Veicoli di proprietà", n.veicoli],
            ["Beni personali", n.beni],
          ]} />
        </Section>
        <Section title="Composizione delle passività">
          <Lines items={[
            ["Mutui residui", n.mutui],
            ["Prestiti e altri debiti", n.altriDebiti],
            ["Saldi negativi dei conti e delle carte", n.debitiConti],
          ]} />
        </Section>
      </div>
    </div>
  );
}
