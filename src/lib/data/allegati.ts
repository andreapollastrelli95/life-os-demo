import { CATEGORIE_DOCUMENTO, DESTINAZIONI, MAX_FILE_BYTES } from "@/lib/destinazioni";
import { deleteRemoteFile, getRemoteFile, isOnline, uploadRemoteFile } from "@/lib/remote";
import type { Allegato, Db, Documento } from "@/lib/types";
import { replaceDb, validateDb, withDb } from "./store";
import type { Result } from "./index";

/*
 * File caricati. Online stanno nel Google Drive del proprietario (cartella «LIFE OS allegati»)
 * e `Allegato.file` è l'id del file su Drive. In demo restano solo in memoria in questa pagina.
 */

const demoFiles = new Map<string, { b64: string; mime: string; name: string }>();

const titleFromName = (name: string) =>
  name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || name;

function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Lettura del file non riuscita."));
    reader.readAsDataURL(file);
  });
}

async function storeFile(f: File): Promise<string> {
  const b64 = await toBase64(f);
  const mime = f.type || "application/octet-stream";
  if (isOnline()) return uploadRemoteFile(f.name, mime, b64);
  const id = crypto.randomUUID();
  demoFiles.set(id, { b64, mime, name: f.name });
  return id;
}

export interface UploadInput {
  files: File[];
  destinazione: string;
  titolo?: string;
  categoria?: string;
  note?: string;
}

export type UploadResult = { ok: true; count: number } | { ok: false; error: string };

export async function addAllegati(input: UploadInput): Promise<UploadResult> {
  const dest = DESTINAZIONI.find((d) => d.slug === input.destinazione);
  if (!dest) return { ok: false, error: "Scegli dove deve andare il file." };
  if (input.files.length === 0) return { ok: false, error: "Nessun file selezionato." };
  if (input.files.length > 20) return { ok: false, error: "Puoi caricare al massimo 20 file alla volta." };
  for (const f of input.files) {
    if (f.size === 0) return { ok: false, error: `«${f.name}» è vuoto.` };
    if (f.size > MAX_FILE_BYTES) return { ok: false, error: `«${f.name}» supera il limite di 25 MB.` };
  }
  const titolo = input.titolo?.trim().slice(0, 300);
  const note = input.note?.trim().slice(0, 2000) || undefined;
  const categoria = (CATEGORIE_DOCUMENTO as readonly string[]).includes(input.categoria ?? "")
    ? input.categoria! : "Altri";

  const now = new Date().toISOString();
  const saved: Allegato[] = [];
  for (const f of input.files) {
    saved.push({
      id: crypto.randomUUID(), createdAt: now, updatedAt: now,
      nome: f.name, file: await storeFile(f), mime: f.type || "application/octet-stream", dimensione: f.size,
      destinazione: dest.slug,
      titolo: input.files.length === 1 && titolo ? titolo : titleFromName(f.name),
      note,
    });
  }

  await withDb((db) => {
    // In Documenti ogni caricamento crea una scheda, a cui i file restano collegati.
    if (dest.crea === "documenti") {
      const doc: Documento = {
        id: crypto.randomUUID(), createdAt: now, updatedAt: now,
        titolo: titolo || saved[0].titolo, categoria, note,
      };
      db.documenti.push(doc);
      for (const a of saved) Object.assign(a, { collezione: "documenti", recordId: doc.id });
    }
    db.allegati.push(...saved);
    return { db, result: undefined };
  });
  return { ok: true, count: saved.length };
}

async function fetchFile(a: Allegato): Promise<Blob> {
  const f = isOnline() ? await getRemoteFile(a.file) : demoFiles.get(a.file);
  if (!f) throw new Error("File non disponibile in modalità demo dopo il ricaricamento della pagina.");
  const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: a.mime || f.mime });
}

/** Apre il file in una nuova scheda (PDF e immagini) oppure lo scarica. */
export async function openAllegato(a: Allegato, download: boolean): Promise<void> {
  // La finestra va aperta subito, prima dell'attesa: altrimenti il browser la blocca.
  const win = download ? null : window.open("", "_blank");
  try {
    const url = URL.createObjectURL(await fetchFile(a));
    if (win) {
      win.location.href = url;
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = a.nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}

export async function deleteAllegato(id: string): Promise<Result> {
  const removed = await withDb<Allegato | null>((db) => {
    const i = db.allegati.findIndex((a) => a.id === id);
    if (i < 0) return { result: null };
    const [a] = db.allegati.splice(i, 1);
    return { db, result: a };
  });
  if (!removed) return { ok: false, error: "Il file non esiste più." };
  try {
    if (isOnline()) await deleteRemoteFile(removed.file);
    else demoFiles.delete(removed.file);
  } catch { /* il file su Drive resta, ma non è più elencato */ }
  return { ok: true };
}

/**
 * Importa l'archivio della vecchia versione sul PC: il file lifeos.json e i file della cartella data\allegati.
 * I file vengono caricati uno alla volta; `onProgress` riceve il numero di file completati.
 */
export async function importArchivio(
  json: File,
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<{ count: number; missing: string[] }> {
  let db: Db;
  try {
    db = validateDb(JSON.parse(await json.text()));
  } catch {
    throw new Error("Il file scelto non è un archivio di LIFE OS (lifeos.json).");
  }
  const byName = new Map(files.map((f) => [f.name, f]));
  const missing: string[] = [];
  const total = db.allegati.length;
  let done = 0;
  onProgress(done, total);
  for (const a of db.allegati) {
    const f = byName.get(a.file);
    if (f) a.file = await storeFile(f);
    else missing.push(a.nome);
    onProgress(++done, total);
  }
  db.allegati = db.allegati.filter((a) => !missing.includes(a.nome));
  await replaceDb(db);
  return { count: total - missing.length, missing };
}
