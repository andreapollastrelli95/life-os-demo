import { describe, expect, it } from "vitest";
import { createSeed } from "@/lib/data/seed";
import type { Conto, Db, Movimento } from "@/lib/types";
import { parseDateIT } from "./dates";
import { accountBalance, computeTotals } from "./finance";
import { formatEUR, parseMoney } from "./money";
import { computeNetWorth } from "./networth";

const stamp = { createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const conto = (id: string, saldoIniziale: number, tipologia: Conto["tipologia"] = "Conto corrente"): Conto => ({
  id, nome: id, tipologia, saldoIniziale, ...stamp,
});
const mov = (id: string, tipo: Movimento["tipo"], importo: number, contoId: string, extra: Partial<Movimento> = {}): Movimento => ({
  id, tipo, importo, contoId, data: "2026-03-10", descrizione: id, ...stamp, ...extra,
});
const emptyDb = (over: Partial<Db> = {}): Db => ({
  meta: { version: 1, seededAt: "2026-01-01" },
  conti: [], movimenti: [], budget: [], passivita: [], documenti: [], immobili: [], speseCasa: [],
  veicoli: [], interventi: [], eventiSalute: [], farmaci: [], abbonamenti: [], beni: [], agenda: [],
  viaggi: [], contatti: [], investimenti: [], obiettivi: [], allegati: [],
  ...over,
});
const TODAY = "2026-06-30";

describe("saldi", () => {
  it("somma entrate e rimborsi, sottrae uscite e investimenti", () => {
    const movimenti = [
      mov("a", "Entrata", 10_000, "c"),
      mov("b", "Uscita", 2_500, "c"),
      mov("d", "Rimborso", 500, "c"),
      mov("e", "Investimento", 1_000, "c"),
    ];
    expect(accountBalance(conto("c", 1_000), movimenti, TODAY)).toBe(8_000);
  });

  it("non conta movimenti futuri né quelli di altri conti", () => {
    const movimenti = [
      mov("a", "Uscita", 300, "c", { data: "2026-12-31" }),
      mov("b", "Uscita", 700, "altro"),
    ];
    expect(accountBalance(conto("c", 1_000), movimenti, TODAY)).toBe(1_000);
  });

  it("resta esatto con i centesimi dove i float sbaglierebbero", () => {
    const movimenti = [mov("a", "Entrata", 10, "c"), mov("b", "Entrata", 20, "c")];
    expect(accountBalance(conto("c", 0), movimenti, TODAY)).toBe(30);
  });
});

describe("trasferimenti", () => {
  const t = mov("t", "Trasferimento", 5_000, "a", { contoDestinazioneId: "b" });

  it("spostano il saldo tra i conti lasciando invariato il totale", () => {
    const a = accountBalance(conto("a", 10_000), [t], TODAY);
    const b = accountBalance(conto("b", 0), [t], TODAY);
    expect([a, b]).toEqual([5_000, 5_000]);
    expect(a + b).toBe(10_000);
  });

  it("non sono né entrate né uscite né risparmio", () => {
    expect(computeTotals([t])).toEqual({ entrate: 0, uscite: 0, investimenti: 0, risparmio: 0 });
  });

  it("i rimborsi riducono le uscite senza diventare entrate", () => {
    const totals = computeTotals([
      mov("e", "Entrata", 100_000, "a"),
      mov("u", "Uscita", 30_000, "a"),
      mov("r", "Rimborso", 10_000, "a"),
      t,
    ]);
    expect(totals).toMatchObject({ entrate: 100_000, uscite: 20_000, risparmio: 80_000 });
  });
});

describe("patrimonio netto", () => {
  const base = { ...stamp, indirizzo: "x", tipologia: "Appartamento" };

  it("è attività meno passività, con saldi negativi come debito", () => {
    const n = computeNetWorth(emptyDb({
      conti: [conto("a", 100_00), conto("carta", -30_00, "Carta di credito")],
      investimenti: [{ id: "i", nome: "i", tipo: "ETF", capitaleInvestito: 40_00, valoreAttuale: 50_00, dataValutazione: TODAY, ...stamp }],
    }), TODAY);
    expect(n).toMatchObject({ liquidita: 100_00, debitiConti: 30_00, investimenti: 50_00 });
    expect(n.netto).toBe(120_00);
  });

  it("applica la quota e ignora gli immobili in locazione", () => {
    const n = computeNetWorth(emptyDb({
      immobili: [
        { id: "p", nome: "p", titolo: "Proprietà", percentuale: 50, valoreStimato: 200_000_00, ...base },
        { id: "l", nome: "l", titolo: "Locazione", percentuale: 100, valoreStimato: 150_000_00, ...base },
      ],
    }), TODAY);
    expect(n.immobili).toBe(100_000_00);
  });

  it("non duplica: un trasferimento non cambia il netto, un mutuo collegato conta una volta", () => {
    const db = emptyDb({
      conti: [conto("a", 1_000_00), conto("b", 0)],
      immobili: [{ id: "p", nome: "p", titolo: "Proprietà", percentuale: 100, valoreStimato: 100_000_00, ...base }],
      passivita: [{ id: "m", nome: "m", tipo: "Mutuo", importoIniziale: 90_000_00, residuo: 60_000_00, immobileId: "p", ...stamp }],
    });
    const prima = computeNetWorth(db, TODAY);
    db.movimenti.push(mov("t", "Trasferimento", 500_00, "a", { contoDestinazioneId: "b" }));
    const dopo = computeNetWorth(db, TODAY);
    expect(dopo.netto).toBe(prima.netto);
    expect(dopo.netto).toBe(41_000_00);
    expect(dopo.passivita).toBe(60_000_00);
  });

  it("i dati demo sono coerenti: netto = attività − passività", () => {
    const n = computeNetWorth(createSeed("2026-11-05"), "2026-11-05");
    expect(n.netto).toBe(n.liquidita + n.investimenti + n.immobili + n.veicoli + n.beni - n.mutui - n.altriDebiti - n.debitiConti);
    expect(n.netto).toBeGreaterThan(0);
  });
});

describe("formati italiani", () => {
  it("legge e scrive gli importi", () => {
    expect(parseMoney("1.234,56")).toBe(123_456);
    expect(parseMoney("1234,5")).toBe(123_450);
    expect(parseMoney("1234.56")).toBe(123_456);
    expect(parseMoney("1.234")).toBe(123_400);
    expect(parseMoney("12,345")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(formatEUR(-123_456)).toBe("-1.234,56 €");
  });

  it("rifiuta le date inesistenti", () => {
    expect(parseDateIT("29/02/2028")).toBe("2028-02-29");
    expect(parseDateIT("31/02/2026")).toBeNull();
  });
});
