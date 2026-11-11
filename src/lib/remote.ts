/**
 * Collegamento all'archivio online (Google Apps Script, lo stesso delle altre app personali).
 * - Con la chiave nel link (?k=...) i dati stanno nel Google Drive del proprietario e servono il PIN.
 * - Senza chiave l'app gira in modalità demo: dati fittizi salvati solo in questo browser.
 */
const EXEC = process.env.NEXT_PUBLIC_EXEC_URL ?? "";
const APP = "los";
const KEY_STORE = "app-personali-k"; // stessa chiave salvata dalle altre app
const PIN_STORE = "lifeos-pin";

export function accessKey(): string | null {
  if (typeof window === "undefined") return null;
  const m = (window.location.search + window.location.hash).match(/[?&#]k=([A-Za-z0-9]+)/);
  try {
    if (m) {
      localStorage.setItem(KEY_STORE, m[1]);
      return m[1];
    }
    return localStorage.getItem(KEY_STORE);
  } catch {
    return m ? m[1] : null;
  }
}

/** true quando l'app è collegata all'archivio online (altrimenti demo). */
export const isOnline = (): boolean => EXEC !== "" && accessKey() !== null;

// Il PIN resta solo per la sessione: chiudendo l'app (o la scheda) viene richiesto di nuovo.
export function getPin(): string | null {
  try { return sessionStorage.getItem(PIN_STORE); } catch { return null; }
}
export function rememberPin(pin: string): void {
  try { sessionStorage.setItem(PIN_STORE, pin); } catch { /* sessione privata */ }
}
export function forgetPin(): void {
  try { sessionStorage.removeItem(PIN_STORE); } catch { /* niente */ }
}

/** Errore di accesso: PIN mancante, errato o bloccato dopo troppi tentativi. */
export class AccessError extends Error {
  constructor(message: string, readonly code: "NOPIN" | "PIN" | "LOCKED") {
    super(message);
  }
}

/** I dati sul server sono cambiati da un altro dispositivo. */
export class ConflictError extends Error {}

interface Reply<T> { status: number; body: T & { error?: string; code?: string } }

async function call<T>(method: string, path: string, body: Record<string, unknown> = {}): Promise<Reply<T>> {
  let res: Response;
  try {
    res = await fetch(EXEC, {
      method: "POST",
      credentials: "omit",
      body: JSON.stringify({ k: accessKey(), name: "appApi", args: [APP, method, path, { ...body, pin: body.pin ?? getPin() }] }),
    });
  } catch {
    throw new Error("Connessione non riuscita: controlla Internet e riprova.");
  }
  const json = (await res.json()) as { ok: boolean; result?: Reply<T>; error?: string };
  if (!json.ok || !json.result) throw new Error(json.error || "Errore del server.");
  const r = json.result;
  if (r.status === 401) {
    const code = (r.body.code as "NOPIN" | "PIN" | "LOCKED") ?? "PIN";
    throw new AccessError(r.body.error || "PIN richiesto.", code);
  }
  if (r.status >= 400 && r.status !== 409) throw new Error(r.body.error || `Errore ${r.status}.`);
  return r;
}

export async function pinIsSet(): Promise<boolean> {
  return (await call<{ set: boolean }>("GET", "/pin")).body.set;
}

export async function createPin(newPin: string, oldPin?: string): Promise<void> {
  await call("POST", "/pin", { newPin, pin: oldPin ?? "" });
}

export interface Stored<D> { version: number; data: D | null }

export async function loadRemote<D>(pin?: string): Promise<Stored<D>> {
  return (await call<Stored<D>>("GET", "/api/data", pin ? { pin } : {})).body;
}

/** Salva tutto l'archivio. Se nel frattempo un altro dispositivo ha salvato, restituisce i suoi dati. */
export async function saveRemote<D>(baseVersion: number, data: D): Promise<{ version: number } | { conflict: Stored<D> }> {
  const r = await call<Stored<D>>("PUT", "/api/data", { baseVersion, data });
  if (r.status === 409) return { conflict: r.body };
  return { version: r.body.version };
}

export async function backupRemote(): Promise<void> {
  await call("POST", "/backup");
}

export async function uploadRemoteFile(name: string, mime: string, b64: string): Promise<string> {
  return (await call<{ id: string }>("POST", "/file", { name, mime, b64 })).body.id;
}

export async function getRemoteFile(id: string): Promise<{ b64: string; mime: string; name: string }> {
  return (await call<{ b64: string; mime: string; name: string }>("GET", "/file", { id })).body;
}

export async function deleteRemoteFile(id: string): Promise<void> {
  await call("DELETE", "/file", { id });
}
