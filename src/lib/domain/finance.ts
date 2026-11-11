import type { Conto, Movimento } from "@/lib/types";
import { MESI } from "./dates";

/**
 * Effetto di un movimento sul saldo di un conto.
 * - Entrata e Rimborso accreditano; Uscita e Investimento addebitano.
 * - Trasferimento: addebita l'origine e accredita la destinazione.
 */
export function movementEffect(m: Movimento, contoId: string): number {
  switch (m.tipo) {
    case "Entrata":
    case "Rimborso":
      return m.contoId === contoId ? m.importo : 0;
    case "Uscita":
    case "Investimento":
      return m.contoId === contoId ? -m.importo : 0;
    case "Trasferimento":
      return (m.contoId === contoId ? -m.importo : 0) + (m.contoDestinazioneId === contoId ? m.importo : 0);
  }
}

/** Saldo calcolato alla data indicata: i movimenti futuri non sono ancora contabilizzati. */
export function accountBalance(conto: Conto, movimenti: Movimento[], asOf: string): number {
  return movimenti.reduce(
    (saldo, m) => (m.data <= asOf ? saldo + movementEffect(m, conto.id) : saldo),
    conto.saldoIniziale,
  );
}

export interface Totals {
  entrate: number;
  /** Uscite al netto dei rimborsi. */
  uscite: number;
  investimenti: number;
  /** Entrate meno uscite. Trasferimenti e investimenti non lo riducono. */
  risparmio: number;
}

/** Totali su un elenco di movimenti: i trasferimenti non entrano in nessuna voce. */
export function computeTotals(movimenti: Movimento[]): Totals {
  let entrate = 0;
  let uscite = 0;
  let investimenti = 0;
  for (const m of movimenti) {
    if (m.tipo === "Entrata") entrate += m.importo;
    else if (m.tipo === "Uscita") uscite += m.importo;
    else if (m.tipo === "Rimborso") uscite -= m.importo;
    else if (m.tipo === "Investimento") investimenti += m.importo;
  }
  return { entrate, uscite, investimenti, risparmio: entrate - uscite };
}

export function movementsInYear(movimenti: Movimento[], year: number, asOf?: string): Movimento[] {
  const prefix = `${year}-`;
  return movimenti.filter((m) => m.data.startsWith(prefix) && (!asOf || m.data <= asOf));
}

export function movementsInMonth(movimenti: Movimento[], yearMonth: string): Movimento[] {
  return movimenti.filter((m) => m.data.startsWith(`${yearMonth}-`));
}

export function yearsWithData(movimenti: Movimento[]): number[] {
  return [...new Set(movimenti.map((m) => Number(m.data.slice(0, 4))))].sort((a, b) => b - a);
}

export interface MonthPoint {
  mese: string;
  Entrate: number;
  Uscite: number;
}

/** Serie mensile in EURO (numeri per i grafici, non per i calcoli). */
export function monthlySeries(movimenti: Movimento[], year: number): MonthPoint[] {
  const inYear = movementsInYear(movimenti, year);
  return MESI.map((mese, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const t = computeTotals(movementsInMonth(inYear, key));
    return { mese, Entrate: t.entrate / 100, Uscite: t.uscite / 100 };
  });
}

/** Spese nette per categoria (rimborsi sottratti), dalla maggiore alla minore. */
export function expensesByCategory(movimenti: Movimento[]): { categoria: string; totale: number }[] {
  const map = new Map<string, number>();
  for (const m of movimenti) {
    if (m.tipo !== "Uscita" && m.tipo !== "Rimborso") continue;
    const key = m.categoria || "Senza categoria";
    map.set(key, (map.get(key) ?? 0) + (m.tipo === "Uscita" ? m.importo : -m.importo));
  }
  return [...map.entries()]
    .map(([categoria, totale]) => ({ categoria, totale }))
    .filter((c) => c.totale > 0)
    .sort((a, b) => b.totale - a.totale);
}
