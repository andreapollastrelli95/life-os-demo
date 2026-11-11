import type { Db } from "@/lib/types";
import { accountBalance } from "./finance";

export interface NetWorth {
  liquidita: number;
  investimenti: number;
  immobili: number;
  veicoli: number;
  beni: number;
  attivita: number;
  mutui: number;
  altriDebiti: number;
  /** Saldi negativi dei conti (es. carta di credito da saldare). */
  debitiConti: number;
  passivita: number;
  netto: number;
}

/**
 * Patrimonio netto = attività − passività. Ogni valore ha una sola fonte, così nulla
 * è contato due volte:
 * - conti → saldo calcolato: positivo = liquidità, negativo = debito;
 * - investimenti → solo il valore registrato nel modulo (nessun conto li rappresenta);
 * - immobili → valore × quota, solo se di proprietà; la locazione vale zero;
 * - veicoli → solo se di proprietà; leasing e noleggio valgono zero;
 * - beni personali → valore attuale stimato;
 * - debiti → solo la collezione `passivita`, anche se collegati a immobile o veicolo.
 */
export function computeNetWorth(db: Db, today: string): NetWorth {
  let liquidita = 0;
  let debitiConti = 0;
  for (const c of db.conti) {
    const saldo = accountBalance(c, db.movimenti, today);
    if (saldo >= 0) liquidita += saldo;
    else debitiConti += -saldo;
  }

  const investimenti = db.investimenti.reduce((s, i) => s + i.valoreAttuale, 0);
  const immobili = db.immobili
    .filter((i) => i.titolo === "Proprietà")
    .reduce((s, i) => s + Math.round((i.valoreStimato * i.percentuale) / 100), 0);
  const veicoli = db.veicoli
    .filter((v) => v.proprieta === "Proprietà")
    .reduce((s, v) => s + v.valoreStimato, 0);
  const beni = db.beni.reduce((s, b) => s + (b.valoreAttuale ?? 0), 0);

  const mutui = db.passivita.filter((p) => p.tipo === "Mutuo").reduce((s, p) => s + p.residuo, 0);
  const altriDebiti = db.passivita.filter((p) => p.tipo !== "Mutuo").reduce((s, p) => s + p.residuo, 0);

  const attivita = liquidita + investimenti + immobili + veicoli + beni;
  const passivita = mutui + altriDebiti + debitiConti;
  return {
    liquidita, investimenti, immobili, veicoli, beni, attivita,
    mutui, altriDebiti, debitiConti, passivita,
    netto: attivita - passivita,
  };
}
