"use client";

import { Download, FolderUp, Lock, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { resetAction } from "@/app/actions";
import { useData } from "@/components/DataProvider";
import { useToast } from "@/components/Toast";
import { ComingSoon, Modal, PageHeader, Section } from "@/components/ui";
import { importArchivio } from "@/lib/data/allegati";
import { formatDate, todayISO } from "@/lib/domain/dates";
import { createPin } from "@/lib/remote";
import { COLLECTION_KEYS, isDemo } from "@/lib/types";

export default function ImpostazioniPage() {
  const { db, online, lock } = useData();
  const notify = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [changingPin, setChangingPin] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const records = COLLECTION_KEYS.reduce((n, k) => n + db[k].length, 0);
  const demo = isDemo(db);
  const profilo = db.meta.profilo;

  const reset = async () => {
    setBusy(true);
    try {
      const result = await resetAction();
      if (result.ok) notify("success", "Dati demo ripristinati");
      else notify("error", result.error);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const esporta = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos-export-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const importa = async (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (picker.current) picker.current.value = "";
    const json = files.find((f) => f.name.toLowerCase().endsWith(".json"));
    if (!json) return notify("error", "Seleziona anche il file lifeos.json.");
    setBusy(true);
    try {
      const r = await importArchivio(json, files.filter((f) => f !== json), (done, total) =>
        setProgress(total ? `Caricamento dei file: ${done} di ${total}…` : "Salvataggio…"));
      notify("success", `Archivio importato con ${r.count} file.`);
      if (r.missing.length) notify("error", `File non trovati tra quelli scelti: ${r.missing.join(", ")}`);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Importazione non riuscita.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <>
      <PageHeader title="Impostazioni" description="Profilo, accesso e dati." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Profilo">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Nome</dt><dd>{profilo?.nome ?? "Profilo demo"}</dd></div>
            {profilo?.codiceFiscale && <div className="flex justify-between gap-3"><dt className="text-muted">Codice fiscale</dt><dd>{profilo.codiceFiscale}</dd></div>}
            {profilo?.nascita && <div className="flex justify-between gap-3"><dt className="text-muted">Nascita</dt><dd className="text-right">{profilo.nascita}</dd></div>}
            {profilo?.residenza && <div className="flex justify-between gap-3"><dt className="text-muted">Residenza</dt><dd className="text-right">{profilo.residenza}</dd></div>}
            {profilo?.email && <div className="flex justify-between gap-3"><dt className="text-muted">Email</dt><dd>{profilo.email}</dd></div>}
            {profilo?.telefono && <div className="flex justify-between gap-3"><dt className="text-muted">Telefono</dt><dd>{profilo.telefono}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-muted">Accesso</dt><dd className="text-right">{online ? "PIN · dati nel tuo Google Drive" : "Demo: dati solo in questo browser"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Valuta</dt><dd>EUR</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Formato data</dt><dd>GG/MM/AAAA</dd></div>
          </dl>
          {online && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => setChangingPin(true)}>Cambia PIN</button>
              <button type="button" className="btn" onClick={lock}><Lock className="size-4" aria-hidden /> Blocca ora</button>
            </div>
          )}
        </Section>

        <Section title="Dati">
          <p className="text-sm text-muted">
            {records} record e {db.allegati.length} file in archivio.{" "}
            {demo ? "Dati demo generati" : "Dati reali caricati"} il {formatDate(db.meta.seededAt.slice(0, 10))}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={esporta}><Download className="size-4" aria-hidden /> Esporta in JSON</button>
            <button type="button" className="btn" disabled={busy} onClick={() => picker.current?.click()}>
              <FolderUp className="size-4" aria-hidden /> Importa archivio
            </button>
            {demo && (
              <button type="button" className="btn" onClick={() => setConfirming(true)}>
                <RotateCcw className="size-4" aria-hidden /> Ripristina dati demo
              </button>
            )}
          </div>
          <input ref={picker} type="file" multiple className="sr-only" tabIndex={-1} aria-label="Archivio da importare"
            onChange={(e) => importa(e.target.files)} />
          <p className="mt-2 text-xs text-muted">
            Importa: seleziona insieme il file <b>lifeos.json</b> e i file della cartella <b>allegati</b>
            (dalla vecchia versione sul PC: C:\LIFE-OS\data). L&apos;archivio attuale viene sostituito{online ? ", dopo una copia di sicurezza su Drive" : ""}.
          </p>
          {progress && <p role="status" className="mt-2 text-sm font-medium text-night-800">{progress}</p>}
        </Section>

        <Section title="Funzioni non ancora disponibili">
          <div className="flex flex-wrap gap-2">
            <ComingSoon label="Report PDF" />
            <ComingSoon label="Categorie personalizzate" />
            <ComingSoon label="Notifiche configurabili" />
            <ComingSoon label="Accesso dell'assistente ai dati sanitari" />
          </div>
        </Section>
      </div>

      {confirming && (
        <Modal title="Ripristinare i dati demo?" onClose={() => setConfirming(false)}>
          <p className="text-sm">Tutte le modifiche fatte finora verranno sostituite dai dati demo.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setConfirming(false)}>Annulla</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={reset}>Ripristina</button>
          </div>
        </Modal>
      )}

      {changingPin && <ChangePin onClose={() => setChangingPin(false)} />}
    </>
  );
}

function ChangePin({ onClose }: { onClose: () => void }) {
  const notify = useToast();
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 8);

  const save = async () => {
    if (!/^\d{4,8}$/.test(newPin)) return setError("Il nuovo PIN deve avere da 4 a 8 cifre.");
    setBusy(true);
    try {
      await createPin(newPin, oldPin);
      try { sessionStorage.setItem("lifeos-pin", newPin); } catch { /* niente */ }
      notify("success", "PIN cambiato");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Cambia PIN" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label htmlFor="old-pin" className="label">PIN attuale</label>
          <input id="old-pin" className="input" type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(digits(e.target.value))} />
        </div>
        <div>
          <label htmlFor="new-pin" className="label">Nuovo PIN (4-8 cifre)</label>
          <input id="new-pin" className="input" type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(digits(e.target.value))} />
        </div>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>Annulla</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Salva</button>
      </div>
    </Modal>
  );
}
