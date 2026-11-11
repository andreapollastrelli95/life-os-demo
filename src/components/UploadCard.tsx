"use client";

import { FileUp, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { addAllegati } from "@/lib/data/allegati";
import { CATEGORIE_DOCUMENTO, DESTINAZIONI, MAX_FILE_BYTES, formatBytes } from "@/lib/destinazioni";
import { useData } from "./DataProvider";
import { useToast } from "./Toast";

/**
 * Scheda di caricamento: si scelgono uno o più file e il modulo in cui devono andare.
 * `fixedDestinazione` blocca la scelta (usata dentro le pagine dei moduli).
 */
export function UploadCard({ fixedDestinazione }: { fixedDestinazione?: string }) {
  const { online } = useData();
  const notify = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [destinazione, setDestinazione] = useState(fixedDestinazione ?? "");
  const [titolo, setTitolo] = useState("");
  const [categoria, setCategoria] = useState("Altri");
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const dest = DESTINAZIONI.find((d) => d.slug === destinazione);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const incoming = [...list];
    const tooBig = incoming.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) notify("error", `«${tooBig.name}» supera il limite di 25 MB.`);
    setFiles((prev) => [...prev, ...incoming.filter((f) => f.size <= MAX_FILE_BYTES)].slice(0, 20));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const submit = async () => {
    if (files.length === 0) return notify("error", "Scegli almeno un file.");
    if (!dest) return notify("error", "Scegli dove deve andare il file.");
    setBusy(true);
    try {
      const result = await addAllegati({ files, destinazione: dest.slug, titolo, categoria, note });
      if (!result.ok) return notify("error", result.error);
      notify("success", result.count === 1 ? `File salvato in ${dest.label}` : `${result.count} file salvati in ${dest.label}`);
      setFiles([]);
      setTitolo("");
      setNote("");
      if (input.current) input.current.value = "";
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Caricamento non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-4" aria-labelledby="upload-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="upload-title" className="flex items-center gap-2 text-base font-semibold text-night-900">
          <FileUp className="size-4" aria-hidden /> Carica documenti
        </h2>
        {!fixedDestinazione && <Link href="/archivio" className="text-sm font-medium text-accent hover:underline">Tutti i file caricati</Link>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <button type="button" onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)} onDrop={onDrop}
            className={`flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center text-sm transition-colors ${
              dragging ? "border-accent bg-accent/5" : "border-line hover:border-accent hover:bg-canvas"
            }`}>
            <Upload className="size-5 text-muted" aria-hidden />
            <span className="font-medium">Trascina qui i file oppure fai clic per sceglierli</span>
            <span className="text-xs text-muted">PDF, immagini e altri file · fino a 25 MB ciascuno</span>
          </button>
          <input ref={input} type="file" multiple className="sr-only" tabIndex={-1} aria-label="File da caricare"
            onChange={(e) => addFiles(e.target.files)} />

          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-canvas px-2.5 py-1.5 text-sm">
                  <span className="min-w-0 truncate">{f.name} <span className="text-xs text-muted">· {formatBytes(f.size)}</span></span>
                  <button type="button" className="btn-icon size-6" aria-label={`Togli ${f.name}`}
                    onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          {!fixedDestinazione && (
            <div>
              <label htmlFor="up-dest" className="label">Dove deve andare</label>
              <select id="up-dest" className="input" value={destinazione} onChange={(e) => setDestinazione(e.target.value)}>
                <option value="">Scegli la sezione…</option>
                {DESTINAZIONI.map((d) => <option key={d.slug} value={d.slug}>{d.label}</option>)}
              </select>
              {dest && <p className="mt-1 text-xs text-muted">{dest.hint}</p>}
            </div>
          )}

          <div className={dest?.crea === "documenti" ? "grid gap-3 sm:grid-cols-2" : undefined}>
            <div>
              <label htmlFor="up-titolo" className="label">Titolo <span className="font-normal text-muted">(facoltativo)</span></label>
              <input id="up-titolo" className="input" value={titolo} maxLength={300} onChange={(e) => setTitolo(e.target.value)}
                placeholder={files.length > 1 && dest?.crea !== "documenti" ? "Con più file si usa il nome di ciascuno" : "Se vuoto, si usa il nome del file"} />
            </div>
            {dest?.crea === "documenti" && (
              <div>
                <label htmlFor="up-cat" className="label">Tipo di documento</label>
                <select id="up-cat" className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIE_DOCUMENTO.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="up-note" className="label">Note <span className="font-normal text-muted">(facoltative)</span></label>
            <input id="up-note" className="input" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              {dest?.crea === "documenti"
                ? "Crea una scheda in Documenti: numero e scadenza si completano lì."
                : online ? "I file vanno nel tuo Google Drive, cartella «LIFE OS allegati»." : "Demo: i file restano solo in questa pagina."}
            </p>
            <button type="button" className="btn btn-primary" disabled={busy || files.length === 0 || !dest} onClick={submit}>
              <Upload className="size-4" aria-hidden /> {busy ? "Caricamento…" : "Carica"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
