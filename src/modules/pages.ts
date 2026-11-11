import { computeTotals, movementsInMonth, movementsInYear } from "@/lib/domain/finance";
import { formatEUR } from "@/lib/domain/money";
import { computeNetWorth } from "@/lib/domain/networth";
import { subscriptionsTotals } from "@/lib/domain/subscriptions";
import { daysBetween } from "@/lib/domain/dates";
import type { CollectionKey, Db } from "@/lib/types";
import type { Tone } from "./engine";

export interface Stat {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}

export interface Tab {
  id: string;
  label: string;
  collection: CollectionKey;
  /** Vista filtrata su un campo: i nuovi record ereditano il valore. */
  preset?: Record<string, string>;
}

export interface ModuleDef {
  slug: string;
  title: string;
  description: string;
  tabs: Tab[];
  stats?: (db: Db, today: string) => Stat[];
  notice?: string;
  comingSoon?: string[];
}

const within = (date: string | undefined, today: string, days: number) => {
  if (!date) return false;
  const d = daysBetween(today, date);
  return d >= 0 && d <= days;
};

export const MODULES: Record<string, ModuleDef> = {
  finanze: {
    slug: "finanze",
    title: "Finanze",
    description: "Conti, movimenti, budget e debiti. I saldi sono calcolati dai movimenti.",
    tabs: [
      { id: "movimenti", label: "Movimenti", collection: "movimenti" },
      { id: "conti", label: "Conti", collection: "conti" },
      { id: "budget", label: "Budget", collection: "budget" },
      { id: "passivita", label: "Prestiti e mutui", collection: "passivita" },
    ],
    stats: (db, today) => {
      const n = computeNetWorth(db, today);
      const anno = computeTotals(movementsInYear(db.movimenti, Number(today.slice(0, 4)), today));
      const mese = computeTotals(movementsInMonth(db.movimenti, today.slice(0, 7)).filter((m) => m.data <= today));
      return [
        { label: "Liquidità", value: formatEUR(n.liquidita) },
        { label: "Entrate dell'anno", value: formatEUR(anno.entrate) },
        { label: "Uscite dell'anno", value: formatEUR(anno.uscite) },
        { label: "Uscite del mese", value: formatEUR(mese.uscite) },
      ];
    },
    comingSoon: ["Movimenti ricorrenti", "Esportazione CSV"],
  },
  documenti: {
    slug: "documenti",
    title: "Documenti",
    description: "Archivio dei documenti personali con le relative scadenze.",
    tabs: [{ id: "documenti", label: "Documenti", collection: "documenti" }],
    stats: (db, today) => [
      { label: "Documenti", value: String(db.documenti.length) },
      { label: "In scadenza entro 60 giorni", value: String(db.documenti.filter((d) => within(d.dataScadenza, today, 60)).length), tone: "warn" },
      { label: "Scaduti", value: String(db.documenti.filter((d) => d.dataScadenza && d.dataScadenza < today).length), tone: "bad" },
    ],
  },
  casa: {
    slug: "casa",
    title: "Casa e immobili",
    description: "Immobili, mutui e storico delle spese per ogni immobile.",
    tabs: [
      { id: "immobili", label: "Immobili", collection: "immobili" },
      { id: "speseCasa", label: "Spese", collection: "speseCasa" },
      { id: "mutui", label: "Mutui", collection: "passivita", preset: { tipo: "Mutuo" } },
    ],
    stats: (db, today) => {
      const n = computeNetWorth(db, today);
      return [
        { label: "Valore immobiliare (quota)", value: formatEUR(n.immobili) },
        { label: "Mutui residui", value: formatEUR(n.mutui) },
        { label: "Spese da pagare", value: formatEUR(db.speseCasa.filter((s) => s.stato === "Da pagare").reduce((t, s) => t + s.importo, 0)), tone: "warn" },
      ];
    },
    comingSoon: ["Preventivi"],
  },
  auto: {
    slug: "auto",
    title: "Auto e mobilità",
    description: "Veicoli, scadenze e costi di gestione.",
    tabs: [
      { id: "veicoli", label: "Veicoli", collection: "veicoli" },
      { id: "interventi", label: "Interventi e costi", collection: "interventi" },
    ],
    stats: (db, today) => {
      const year = today.slice(0, 4);
      const costoAnno = db.interventi.filter((i) => i.data.startsWith(`${year}-`)).reduce((s, i) => s + i.costo, 0);
      return [
        { label: "Veicoli", value: String(db.veicoli.length) },
        { label: `Costi ${year}`, value: formatEUR(costoAnno) },
        { label: "Valore veicoli di proprietà", value: formatEUR(computeNetWorth(db, today).veicoli) },
      ];
    },
    comingSoon: ["Costo medio per chilometro"],
  },
  salute: {
    slug: "salute",
    title: "Salute",
    description: "Visite, esami e farmaci. Solo archivio personale.",
    tabs: [
      { id: "eventiSalute", label: "Visite ed esami", collection: "eventiSalute" },
      { id: "farmaci", label: "Farmaci", collection: "farmaci" },
    ],
    notice: "LIFE OS non fa diagnosi e non dà raccomandazioni cliniche. L'Assistente AI non legge questa sezione.",
    stats: (db, today) => [
      { label: "Eventi registrati", value: String(db.eventiSalute.length) },
      { label: "Controlli entro 90 giorni", value: String(db.eventiSalute.filter((e) => within(e.prossimoControllo, today, 90)).length), tone: "warn" },
      { label: `Spese sanitarie ${today.slice(0, 4)}`, value: formatEUR(db.eventiSalute.filter((e) => e.data.startsWith(today.slice(0, 5))).reduce((s, e) => s + (e.costo ?? 0), 0)) },
    ],
  },
  abbonamenti: {
    slug: "abbonamenti",
    title: "Abbonamenti e contratti",
    description: "Costi equivalenti e rinnovi di abbonamenti e contratti.",
    tabs: [{ id: "abbonamenti", label: "Abbonamenti", collection: "abbonamenti" }],
    stats: (db, today) => {
      const t = subscriptionsTotals(db.abbonamenti);
      return [
        { label: "Attivi", value: String(t.attivi) },
        { label: "Costo mensile equivalente", value: formatEUR(t.mensile) },
        { label: "Costo annuale", value: formatEUR(t.annuale) },
        { label: "Rinnovi entro 30 giorni", value: String(db.abbonamenti.filter((a) => a.stato === "Attivo" && within(a.dataRinnovo, today, 30)).length), tone: "warn" },
      ];
    },
  },
  beni: {
    slug: "beni",
    title: "Beni personali",
    description: "Inventario di acquisti, valori e garanzie.",
    tabs: [{ id: "beni", label: "Beni", collection: "beni" }],
    stats: (db, today) => [
      { label: "Beni", value: String(db.beni.length) },
      { label: "Valore dell'inventario", value: formatEUR(db.beni.reduce((s, b) => s + (b.valoreAttuale ?? 0), 0)) },
      { label: "Garanzie entro 90 giorni", value: String(db.beni.filter((b) => within(b.scadenzaGaranzia, today, 90)).length), tone: "warn" },
    ],
  },
  agenda: {
    slug: "agenda",
    title: "Agenda",
    description: "Appuntamenti, attività e promemoria.",
    tabs: [{ id: "agenda", label: "Elenco", collection: "agenda" }],
    stats: (db, today) => [
      { label: "Da fare", value: String(db.agenda.filter((a) => a.stato === "Da fare").length) },
      { label: "Nei prossimi 7 giorni", value: String(db.agenda.filter((a) => a.stato === "Da fare" && within(a.data, today, 7)).length), tone: "warn" },
      { label: "Completate", value: String(db.agenda.filter((a) => a.stato === "Completata").length), tone: "good" },
    ],
    comingSoon: ["Viste giornaliera, settimanale e mensile", "Ripetizione automatica"],
  },
  viaggi: {
    slug: "viaggi",
    title: "Viaggi",
    description: "Budget e consuntivo: le spese effettive arrivano dai movimenti collegati al viaggio.",
    tabs: [{ id: "viaggi", label: "Viaggi", collection: "viaggi" }],
    stats: (db, today) => [
      { label: "Viaggi in programma", value: String(db.viaggi.filter((v) => v.stato !== "Concluso").length) },
      { label: "Prossimo viaggio", value: db.viaggi.filter((v) => v.stato !== "Concluso" && v.dataPartenza >= today).sort((a, b) => a.dataPartenza.localeCompare(b.dataPartenza))[0]?.destinazione ?? "—" },
      { label: "Viaggi conclusi", value: String(db.viaggi.filter((v) => v.stato === "Concluso").length) },
    ],
    comingSoon: ["Itinerario"],
  },
  rubrica: {
    slug: "rubrica",
    title: "Rubrica",
    description: "Familiari, amici e professionisti di riferimento.",
    tabs: [{ id: "contatti", label: "Contatti", collection: "contatti" }],
    comingSoon: ["Collegamenti del contatto con gli altri moduli"],
  },
  patrimonio: {
    slug: "patrimonio",
    title: "Patrimonio e futuro",
    description: "Attività meno passività, ogni valore contato una sola volta.",
    tabs: [
      { id: "investimenti", label: "Investimenti", collection: "investimenti" },
      { id: "obiettivi", label: "Obiettivi", collection: "obiettivi" },
    ],
    comingSoon: ["Evoluzione storica", "Proiezioni e simulazioni", "Previdenza e contributi"],
  },
};

/** Collezione → pagina e scheda dove si trova (per la ricerca globale). */
export function locateCollection(key: CollectionKey): { def: ModuleDef; tab: Tab } {
  for (const def of Object.values(MODULES)) {
    const tab = def.tabs.find((t) => t.collection === key && !t.preset);
    if (tab) return { def, tab };
  }
  throw new Error(`Collezione senza pagina: ${key}`);
}
