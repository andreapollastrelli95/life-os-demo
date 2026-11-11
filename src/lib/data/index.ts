import { COLLECTIONS, recordLabel } from "@/modules/collections";
import type { BaseRecord, CollectionKey, Db } from "@/lib/types";
import { COLLECTION_KEYS } from "@/lib/types";
import { resetDb, withDb } from "./store";

/**
 * Unico punto di accesso ai dati: pagine e azioni usano solo queste funzioni.
 * La persistenza (archivio online o demo nel browser) sta tutta in `store.ts`.
 */

export type Result = { ok: true } | { ok: false; error: string };

type AnyRow = BaseRecord & Record<string, unknown>;
const rows = (db: Db, key: CollectionKey) => db[key] as unknown as AnyRow[];

/** I collegamenti devono puntare a record esistenti. */
function checkRelations(db: Db, key: CollectionKey, data: Record<string, unknown>): string | null {
  for (const f of COLLECTIONS[key].fields) {
    const value = data[f.key];
    if (f.type === "relation" && value && !rows(db, f.relation!).some((r) => r.id === value)) {
      return `${f.label}: il record collegato non esiste più.`;
    }
  }
  return null;
}

/** Trova chi usa un record: impedisce eliminazioni che lascerebbero collegamenti rotti. */
function findReferences(db: Db, key: CollectionKey, id: string): string[] {
  const found: string[] = [];
  for (const other of COLLECTION_KEYS) {
    for (const f of COLLECTIONS[other].fields) {
      if (f.type !== "relation" || f.relation !== key) continue;
      const count = rows(db, other).filter((r) => r[f.key] === id).length;
      if (count > 0) found.push(`${count} in ${COLLECTIONS[other].plural}`);
    }
  }
  return found;
}

export function saveRecord(
  key: CollectionKey,
  id: string | null,
  data: Record<string, unknown>,
): Promise<Result> {
  return withDb<Result>((db) => {
    const invalid = checkRelations(db, key, data);
    if (invalid) return { result: { ok: false, error: invalid } };

    const now = new Date().toISOString();
    const list = rows(db, key);
    if (id === null) {
      list.push({ ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as AnyRow);
    } else {
      const i = list.findIndex((r) => r.id === id);
      if (i < 0) return { result: { ok: false, error: "Il record non esiste più." } };
      list[i] = { ...data, id, createdAt: list[i].createdAt, updatedAt: now } as AnyRow;
    }
    return { db, result: { ok: true } };
  });
}

export function patchRecord(key: CollectionKey, id: string, patch: Record<string, unknown>): Promise<Result> {
  return withDb<Result>((db) => {
    const row = rows(db, key).find((r) => r.id === id);
    if (!row) return { result: { ok: false, error: "Il record non esiste più." } };
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    return { db, result: { ok: true } };
  });
}

export function deleteRecord(key: CollectionKey, id: string): Promise<Result> {
  return withDb<Result>((db) => {
    const list = rows(db, key);
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return { result: { ok: false, error: "Il record non esiste più." } };
    const refs = findReferences(db, key, id);
    if (refs.length > 0) {
      const nome = recordLabel(key, list[i], db);
      return { result: { ok: false, error: `Impossibile eliminare «${nome}»: è collegato a ${refs.join(", ")}.` } };
    }
    list.splice(i, 1);
    // I file collegati restano in archivio, ma senza il collegamento al record eliminato.
    for (const a of db.allegati) {
      if (a.collezione === key && a.recordId === id) {
        delete a.collezione;
        delete a.recordId;
      }
    }
    return { db, result: { ok: true } };
  });
}

export function resetDemoData(): Promise<void> {
  return resetDb();
}
