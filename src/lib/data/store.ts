import { todayISO } from "@/lib/domain/dates";
import { ConflictError, backupRemote, isOnline, loadRemote, saveRemote } from "@/lib/remote";
import { COLLECTION_KEYS, type Db } from "@/lib/types";
import { createSeed } from "./seed";

/**
 * Archivio nel browser. Online: copia dell'archivio salvato nel Google Drive del proprietario,
 * riscritto per intero a ogni modifica con controllo di versione (niente sovrascritture tra dispositivi).
 * Demo: dati fittizi salvati in localStorage.
 */
const DEMO_STORE = "lifeos-demo-db";

let current: Db | null = null;
let version = 0;
const listeners = new Set<(db: Db) => void>();

function normalize(raw: unknown): Db {
  const db = raw as Db;
  if (!db || typeof db !== "object" || !db.meta) throw new Error("Archivio non valido.");
  for (const key of COLLECTION_KEYS) {
    if (!Array.isArray(db[key])) throw new Error(`Archivio non valido: manca "${key}"`);
  }
  if (!Array.isArray(db.allegati)) db.allegati = [];
  return db;
}

export { normalize as validateDb };

function emit() {
  if (current) for (const l of listeners) l(current);
}

export function subscribe(fn: (db: Db) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDb(): Db | null {
  return current;
}

function saveDemo(db: Db) {
  try { localStorage.setItem(DEMO_STORE, JSON.stringify(db)); } catch { /* spazio pieno: resta in memoria */ }
}

/** Primo caricamento (dopo il PIN, se online). */
export async function loadDb(pin?: string): Promise<Db> {
  if (isOnline()) {
    const r = await loadRemote<Db>(pin);
    if (r.data) {
      current = normalize(r.data);
      version = r.version;
    } else {
      // Archivio online ancora vuoto: si parte dai dati demo, sostituibili con «Importa» in Impostazioni.
      version = r.version;
      current = createSeed(todayISO());
      await persist(current);
    }
  } else {
    let saved: Db | null = null;
    try {
      const raw = localStorage.getItem(DEMO_STORE);
      if (raw) saved = normalize(JSON.parse(raw));
    } catch { saved = null; }
    current = saved ?? createSeed(todayISO());
    if (!saved) saveDemo(current);
  }
  emit();
  return current;
}

async function persist(db: Db): Promise<void> {
  if (!isOnline()) return saveDemo(db);
  const r = await saveRemote(version, db);
  if ("conflict" in r) {
    if (r.conflict.data) current = normalize(r.conflict.data);
    version = r.conflict.version;
    emit();
    throw new ConflictError("I dati sono stati modificati da un altro dispositivo e sono stati ricaricati: ripeti l'operazione.");
  }
  version = r.version;
}

// Le scritture passano in coda: due salvataggi ravvicinati non si sovrascrivono.
let queue: Promise<unknown> = Promise.resolve();

export function withDb<T>(fn: (db: Db) => { db?: Db; result: T }): Promise<T> {
  const run = queue.then(async () => {
    if (!current) throw new Error("Dati non ancora caricati.");
    const { db, result } = fn(structuredClone(current));
    if (db) {
      await persist(db);
      current = db;
      emit();
    }
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Ricontrolla l'archivio online: se un altro dispositivo l'ha cambiato, aggiorna la pagina. */
export function refreshDb(): Promise<void> {
  if (!isOnline() || !current) return Promise.resolve();
  const run = queue.then(async () => {
    const r = await loadRemote<Db>();
    if (r.data && r.version !== version) {
      current = normalize(r.data);
      version = r.version;
      emit();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Sostituisce l'intero archivio (importazione o ripristino demo), con copia di sicurezza online. */
export async function replaceDb(db: Db): Promise<void> {
  if (isOnline()) await backupRemote();
  await withDb(() => ({ db: normalize(db), result: undefined }));
}

export function resetDb(): Promise<void> {
  return replaceDb(createSeed(todayISO()));
}
