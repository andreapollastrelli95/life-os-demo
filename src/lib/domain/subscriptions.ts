import type { Abbonamento, Frequenza } from "@/lib/types";

const PERIODI_ANNO: Record<Frequenza, number> = {
  Mensile: 12, Bimestrale: 6, Trimestrale: 4, Semestrale: 2, Annuale: 1,
};

export function annualCost(a: Pick<Abbonamento, "costo" | "frequenza">): number {
  return a.costo * PERIODI_ANNO[a.frequenza];
}

export function monthlyCost(a: Pick<Abbonamento, "costo" | "frequenza">): number {
  return Math.round(annualCost(a) / 12);
}

/** Totale degli abbonamenti attivi: il mensile è calcolato sull'annuale, senza sommare arrotondamenti. */
export function subscriptionsTotals(abbonamenti: Abbonamento[]) {
  const attivi = abbonamenti.filter((a) => a.stato === "Attivo");
  const annuale = attivi.reduce((s, a) => s + annualCost(a), 0);
  return { attivi: attivi.length, annuale, mensile: Math.round(annuale / 12) };
}
