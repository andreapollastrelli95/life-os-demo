"use client";

import { Lock } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { loadDb, refreshDb, subscribe } from "@/lib/data/store";
import { todayISO } from "@/lib/domain/dates";
import { AccessError, createPin, forgetPin, isOnline, pinIsSet, rememberPin } from "@/lib/remote";
import type { Db } from "@/lib/types";

interface DataContextValue {
  db: Db;
  today: string;
  online: boolean;
  lock: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

type Phase =
  | { kind: "loading" }
  | { kind: "create" }
  | { kind: "pin"; error?: string }
  | { kind: "error"; error: string }
  | { kind: "ready"; db: Db };

/**
 * Carica l'archivio nel browser e lo tiene aggiornato.
 * Online chiede il PIN (o lo fa creare la prima volta); ogni 60 secondi e al ritorno sull'app
 * ricontrolla se un altro dispositivo ha cambiato i dati.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  // Il markup iniziale dipende solo da `phase`, quindi leggere il browser qui non crea differenze con l'HTML statico.
  const [online] = useState(() => typeof window !== "undefined" && isOnline());
  const [today] = useState(() => todayISO());

  const open = useCallback(async (pin?: string) => {
    setPhase({ kind: "loading" });
    try {
      if (pin) rememberPin(pin); // serve già durante il caricamento (primo salvataggio dell'archivio)
      const db = await loadDb(pin);
      setPhase({ kind: "ready", db });
    } catch (err) {
      if (err instanceof AccessError) {
        forgetPin();
        setPhase(err.code === "NOPIN" ? { kind: "create" } : { kind: "pin", error: pin ? err.message : undefined });
      } else {
        setPhase({ kind: "error", error: err instanceof Error ? err.message : "Errore imprevisto." });
      }
    }
  }, []);

  useEffect(() => {
    const on = isOnline();
    const unsub = subscribe((db) => setPhase({ kind: "ready", db }));
    (async () => {
      if (!on) return open();
      try {
        if (!(await pinIsSet())) return setPhase({ kind: "create" });
        return open();
      } catch (err) {
        setPhase({ kind: "error", error: err instanceof Error ? err.message : "Errore imprevisto." });
      }
    })();
    return () => { unsub(); };
  }, [open]);

  // Sincronizzazione con gli altri dispositivi.
  const ready = phase.kind === "ready";
  useEffect(() => {
    if (!ready || !online) return;
    const check = () => { if (document.visibilityState === "visible") refreshDb().catch(() => undefined); };
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [ready, online]);

  const lock = useCallback(() => {
    forgetPin();
    window.location.reload();
  }, []);

  const value = useMemo(
    () => (phase.kind === "ready" ? { db: phase.db, today, online, lock } : null),
    [phase, today, online, lock],
  );

  if (phase.kind === "create") return <PinScreen create onSubmit={async (pin) => { await createPin(pin); await open(pin); }} />;
  if (phase.kind === "pin") return <PinScreen error={phase.error} onSubmit={(pin) => open(pin)} />;
  if (phase.kind === "error") {
    return (
      <Centered>
        <h1 className="text-lg font-semibold text-night-900">LIFE OS non riesce a caricare i dati</h1>
        <p className="mt-2 text-sm text-muted">{phase.error}</p>
        <button type="button" className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Riprova</button>
      </Centered>
    );
  }
  if (!value) return <Centered><p className="text-sm text-muted">Caricamento di LIFE OS…</p></Centered>;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 text-center">{children}</div>
    </div>
  );
}

function PinScreen({ create = false, error, onSubmit }: { create?: boolean; error?: string; onSubmit: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [message, setMessage] = useState<string | undefined>(error);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) return setMessage("Il PIN deve avere da 4 a 8 cifre.");
    if (create && pin !== again) return setMessage("I due PIN non coincidono.");
    setBusy(true);
    setMessage(undefined);
    try {
      await onSubmit(pin);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Centered>
      <Lock className="mx-auto size-7 text-night-800" aria-hidden />
      <h1 className="mt-2 text-lg font-semibold text-night-900">LIFE OS</h1>
      <p className="mt-1 text-sm text-muted">
        {create ? "Crea il PIN che servirà per aprire l'app su PC e telefono." : "Inserisci il PIN per aprire i tuoi dati."}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3 text-left">
        <div>
          <label htmlFor="pin" className="label">{create ? "Nuovo PIN (4-8 cifre)" : "PIN"}</label>
          <input id="pin" className="input text-center text-lg tracking-[0.4em]" type="password" inputMode="numeric"
            autoComplete={create ? "new-password" : "current-password"} maxLength={8} autoFocus
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        </div>
        {create && (
          <div>
            <label htmlFor="pin2" className="label">Ripeti il PIN</label>
            <input id="pin2" className="input text-center text-lg tracking-[0.4em]" type="password" inputMode="numeric"
              autoComplete="new-password" maxLength={8}
              value={again} onChange={(e) => setAgain(e.target.value.replace(/\D/g, ""))} />
          </div>
        )}
        {message && <p role="alert" className="text-sm text-bad">{message}</p>}
        <button type="submit" className="btn btn-primary w-full justify-center" disabled={busy}>
          {busy ? "Attendere…" : create ? "Crea PIN e apri" : "Apri"}
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">Dopo 5 tentativi sbagliati l&apos;accesso si blocca per 15 minuti.</p>
    </Centered>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve stare dentro DataProvider");
  return ctx;
}
