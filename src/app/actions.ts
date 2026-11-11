import { deleteRecord, patchRecord, resetDemoData, saveRecord } from "@/lib/data";
import { deleteAllegato } from "@/lib/data/allegati";
import { AccessError, ConflictError } from "@/lib/remote";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { COLLECTIONS } from "@/modules/collections";
import { parseRecord, type FormValues } from "@/modules/engine";

/*
 * Azioni chiamate dai componenti. Girano nel browser: la validazione è la stessa del form
 * e il salvataggio passa dal livello dati (archivio online o demo).
 */

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC_ERROR = "Operazione non riuscita. Riprova.";

const isCollection = (key: string): key is CollectionKey =>
  (COLLECTION_KEYS as string[]).includes(key);

async function guarded(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    if (err instanceof ConflictError || err instanceof AccessError) return { ok: false, error: err.message };
    if (err instanceof Error && /Connessione/.test(err.message)) return { ok: false, error: err.message };
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Crea (id null) o aggiorna un record. */
export async function saveAction(key: string, id: string | null, raw: FormValues): Promise<ActionResult> {
  return guarded(async () => {
    if (!isCollection(key)) return { ok: false, error: GENERIC_ERROR };
    const parsed = parseRecord(COLLECTIONS[key], raw);
    if (!parsed.ok) return { ok: false, error: "Controlla i campi evidenziati.", fieldErrors: parsed.errors };
    return saveRecord(key, id, parsed.data);
  });
}

export async function deleteAction(key: string, id: string): Promise<ActionResult> {
  return guarded(async () => {
    if (!isCollection(key)) return { ok: false, error: GENERIC_ERROR };
    return deleteRecord(key, id);
  });
}

/** Esegue un'azione di riga dichiarata nella configurazione: il chiamante non sceglie i campi. */
export async function rowAction(key: string, id: string, actionId: string): Promise<ActionResult> {
  return guarded(async () => {
    if (!isCollection(key)) return { ok: false, error: GENERIC_ERROR };
    const action = COLLECTIONS[key].rowActions?.find((a) => a.id === actionId);
    if (!action) return { ok: false, error: GENERIC_ERROR };
    return patchRecord(key, id, action.patch);
  });
}

export async function resetAction(): Promise<ActionResult> {
  return guarded(async () => {
    await resetDemoData();
    return { ok: true };
  });
}

export async function deleteAllegatoAction(id: string): Promise<ActionResult> {
  return guarded(async () => deleteAllegato(id));
}
