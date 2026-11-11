"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MODULES } from "@/modules/pages";
import { DESTINAZIONI } from "@/lib/destinazioni";
import { AllegatiList, byNewest } from "./AllegatiList";
import { CollectionView } from "./CollectionView";
import { useData } from "./DataProvider";
import { NetWorthPanel } from "./NetWorthPanel";
import { ComingSoonRow, PageHeader, Section, StatCard, StatGrid } from "./ui";
import { UploadCard } from "./UploadCard";

/** Pagina generica di un modulo: statistiche, schede e tabella derivano dalla configurazione. */
export function ModulePage({ slug }: { slug: string }) {
  const { db, today } = useData();
  const params = useSearchParams();
  const def = MODULES[slug];
  const tab = def.tabs.find((t) => t.id === params.get("tab")) ?? def.tabs[0];
  const q = params.get("q") ?? "";
  const accettaFile = DESTINAZIONI.some((d) => d.slug === slug);
  const files = db.allegati.filter((a) => a.destinazione === slug).sort(byNewest);

  return (
    <>
      <PageHeader title={def.title} description={def.description} />

      {def.notice && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-night-800/5 px-3 py-2 text-sm text-night-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {def.notice}
        </p>
      )}

      {slug === "patrimonio" && <NetWorthPanel />}

      {def.stats && (
        <div className="mb-5">
          <StatGrid>{def.stats(db, today).map((s) => <StatCard key={s.label} {...s} />)}</StatGrid>
        </div>
      )}

      {def.tabs.length > 1 && (
        <div role="tablist" className="mb-3 flex gap-1 overflow-x-auto border-b border-line">
          {def.tabs.map((t) => (
            <Link key={t.id} role="tab" aria-selected={t.id === tab.id} href={`/${slug}?tab=${t.id}`} scroll={false}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
                t.id === tab.id ? "border-accent text-night-900" : "border-transparent text-muted hover:text-ink"
              }`}>
              {t.label}
            </Link>
          ))}
        </div>
      )}

      {/* La chiave azzera ricerca e filtri quando cambiano scheda o parametri. */}
      <CollectionView key={`${tab.id}:${q}`} collection={tab.collection} preset={tab.preset} initialSearch={q} />

      {accettaFile && (
        <div className="mt-5 space-y-4">
          <Section title={`File di ${def.title} (${files.length})`}>
            <AllegatiList items={files} emptyText="Nessun file caricato in questa sezione." />
          </Section>
          <UploadCard key={slug} fixedDestinazione={slug} />
        </div>
      )}

      <ComingSoonRow labels={def.comingSoon} />
    </>
  );
}
