"use client";

import { useState } from "react";
import { AllegatiList, byNewest } from "@/components/AllegatiList";
import { useData } from "@/components/DataProvider";
import { UploadCard } from "@/components/UploadCard";
import { PageHeader, Section, StatCard, StatGrid } from "@/components/ui";
import { DESTINAZIONI, formatBytes } from "@/lib/destinazioni";

export default function ArchivioPage() {
  const { db } = useData();
  const [filtro, setFiltro] = useState("");
  const items = db.allegati.filter((a) => !filtro || a.destinazione === filtro).sort(byNewest);
  const sezioni = new Set(db.allegati.map((a) => a.destinazione)).size;

  return (
    <>
      <PageHeader title="File caricati" description="Tutti i documenti caricati, con la sezione in cui sono stati archiviati." />

      <div className="mb-5">
        <StatGrid>
          <StatCard label="File in archivio" value={String(db.allegati.length)} />
          <StatCard label="Spazio occupato" value={formatBytes(db.allegati.reduce((s, a) => s + a.dimensione, 0))} />
          <StatCard label="Sezioni con file" value={String(sezioni)} />
        </StatGrid>
      </div>

      <div className="space-y-4">
        <UploadCard />
        <Section title="Archivio" action={
          <select className="input w-auto" aria-label="Filtra per sezione" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Tutte le sezioni</option>
            {DESTINAZIONI.map((d) => <option key={d.slug} value={d.slug}>{d.label}</option>)}
          </select>
        }>
          <AllegatiList items={items} showDestinazione emptyText="Nessun file in questa sezione." />
        </Section>
      </div>
    </>
  );
}
