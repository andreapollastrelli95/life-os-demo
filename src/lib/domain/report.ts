import type { Db } from "@/lib/types";
import { computeTotals, expensesByCategory, movementsInYear, type Totals } from "./finance";
import { annualCost } from "./subscriptions";

export interface YearReport {
  year: number;
  totals: Totals;
  /** Risparmio in percentuale sulle entrate, null se non ci sono entrate. */
  tassoRisparmio: number | null;
  categorie: { categoria: string; totale: number }[];
  perImmobile: { nome: string; totale: number }[];
  perVeicolo: { nome: string; totale: number }[];
  sanita: number;
  acquisti: { nome: string; prezzo: number }[];
}

export function yearReport(db: Db, year: number): YearReport {
  const prefix = `${year}-`;
  const movimenti = movementsInYear(db.movimenti, year);
  const totals = computeTotals(movimenti);

  const perImmobile = db.immobili.map((i) => ({
    nome: i.nome,
    totale: db.speseCasa
      .filter((s) => s.immobileId === i.id && s.data.startsWith(prefix))
      .reduce((t, s) => t + s.importo, 0),
  }));
  const perVeicolo = db.veicoli.map((v) => ({
    nome: `${v.marca} ${v.modello}`,
    totale: db.interventi
      .filter((x) => x.veicoloId === v.id && x.data.startsWith(prefix))
      .reduce((t, x) => t + x.costo, 0),
  }));

  return {
    year,
    totals,
    tassoRisparmio: totals.entrate > 0 ? (totals.risparmio / totals.entrate) * 100 : null,
    categorie: expensesByCategory(movimenti),
    perImmobile,
    perVeicolo,
    sanita: db.eventiSalute
      .filter((e) => e.data.startsWith(prefix))
      .reduce((t, e) => t + (e.costo ?? 0), 0),
    acquisti: db.beni
      .filter((b) => b.dataAcquisto?.startsWith(prefix))
      .map((b) => ({ nome: b.nome, prezzo: b.prezzo ?? 0 }))
      .sort((a, b) => b.prezzo - a.prezzo),
  };
}

/** Costo annuale teorico degli abbonamenti oggi attivi (non legato a un anno passato). */
export function activeSubscriptionsAnnual(db: Db): number {
  return db.abbonamenti.filter((a) => a.stato === "Attivo").reduce((t, a) => t + annualCost(a), 0);
}

/** Variazione percentuale; null se il valore di partenza è zero (confronto non significativo). */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
