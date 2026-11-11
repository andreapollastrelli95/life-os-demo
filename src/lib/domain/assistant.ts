import type { Db } from "@/lib/types";
import { addDays, daysBetween, formatDate } from "./dates";
import { computeTotals, movementsInMonth, movementsInYear } from "./finance";
import { formatEUR } from "./money";
import { computeNetWorth } from "./networth";
import { deltaPercent } from "./report";
import { monthlyCost, subscriptionsTotals } from "./subscriptions";

export interface Answer {
  text: string;
  items?: string[];
}

export interface Question {
  id: string;
  label: string;
  answer: (db: Db, today: string) => Answer;
}

const yearOf = (iso: string) => Number(iso.slice(0, 4));

// Risposte calcolate solo dai dati. Nessun servizio esterno; i dati sanitari non vengono letti.
export const QUESTIONS: Question[] = [
  {
    id: "mese",
    label: "Quanto ho speso questo mese?",
    answer: (db, today) => {
      const movs = movementsInMonth(db.movimenti, today.slice(0, 7)).filter((m) => m.data <= today);
      if (movs.length === 0) return { text: "Non ci sono movimenti registrati questo mese." };
      return { text: `Da inizio mese hai speso ${formatEUR(computeTotals(movs).uscite)}, al netto dei rimborsi. Trasferimenti e investimenti non sono inclusi.` };
    },
  },
  {
    id: "risparmio",
    label: "Quanto ho risparmiato quest'anno?",
    answer: (db, today) => {
      const year = yearOf(today);
      const t = computeTotals(movementsInYear(db.movimenti, year, today));
      if (t.entrate === 0 && t.uscite === 0) return { text: `Non ci sono movimenti registrati nel ${year}.` };
      return { text: `Nel ${year}, fino a oggi, hai risparmiato ${formatEUR(t.risparmio)}: entrate ${formatEUR(t.entrate)} meno uscite ${formatEUR(t.uscite)}.` };
    },
  },
  {
    id: "patrimonio",
    label: "Quanto vale il mio patrimonio?",
    answer: (db, today) => {
      const n = computeNetWorth(db, today);
      return {
        text: `Il patrimonio netto è ${formatEUR(n.netto)}: attività ${formatEUR(n.attivita)} meno passività ${formatEUR(n.passivita)}.`,
        items: [
          `Liquidità: ${formatEUR(n.liquidita)}`,
          `Investimenti: ${formatEUR(n.investimenti)}`,
          `Immobili (quota di proprietà): ${formatEUR(n.immobili)}`,
          `Veicoli e beni: ${formatEUR(n.veicoli + n.beni)}`,
        ],
      };
    },
  },
  {
    id: "abbonamenti",
    label: "Quali abbonamenti sono attivi?",
    answer: (db) => {
      const attivi = db.abbonamenti.filter((a) => a.stato === "Attivo");
      if (attivi.length === 0) return { text: "Non risultano abbonamenti attivi." };
      const t = subscriptionsTotals(db.abbonamenti);
      return {
        text: `Abbonamenti attivi: ${t.attivi}, per ${formatEUR(t.mensile)} al mese e ${formatEUR(t.annuale)} all'anno.`,
        items: attivi.map((a) => `${a.nome}: ${formatEUR(monthlyCost(a))} al mese`),
      };
    },
  },
  {
    id: "documenti",
    label: "Quali documenti scadono entro 60 giorni?",
    answer: (db, today) => {
      const limite = addDays(today, 60);
      const docs = db.documenti
        .filter((d) => d.dataScadenza && d.dataScadenza >= today && d.dataScadenza <= limite)
        .sort((a, b) => a.dataScadenza!.localeCompare(b.dataScadenza!));
      if (docs.length === 0) return { text: "Nessun documento scade nei prossimi 60 giorni." };
      return {
        text: `Documenti in scadenza entro 60 giorni: ${docs.length}.`,
        items: docs.map((d) => `${d.titolo}: ${formatDate(d.dataScadenza)} (tra ${daysBetween(today, d.dataScadenza!)} giorni)`),
      };
    },
  },
  {
    id: "top",
    label: "Quali sono le spese più importanti dell'anno?",
    answer: (db, today) => {
      const top = movementsInYear(db.movimenti, yearOf(today), today)
        .filter((m) => m.tipo === "Uscita")
        .sort((a, b) => b.importo - a.importo)
        .slice(0, 5);
      if (top.length === 0) return { text: "Non ci sono uscite registrate quest'anno." };
      return {
        text: `Le uscite più alte del ${yearOf(today)}:`,
        items: top.map((m) => `${m.descrizione}: ${formatEUR(m.importo)} (${formatDate(m.data)})`),
      };
    },
  },
  {
    id: "auto",
    label: "Quanto costa l'auto ogni anno?",
    answer: (db, today) => {
      if (db.veicoli.length === 0) return { text: "Non risultano veicoli registrati." };
      const dal = addDays(today, -365);
      const items = db.veicoli.map((v) => {
        const costo = db.interventi
          .filter((i) => i.veicoloId === v.id && i.data > dal && i.data <= today)
          .reduce((s, i) => s + i.costo, 0);
        return `${v.marca} ${v.modello}: ${formatEUR(costo)}`;
      });
      return { text: "Costi registrati negli ultimi 12 mesi, in base alle voci inserite in Auto e mobilità:", items };
    },
  },
  {
    id: "confronto",
    label: "Come sono cambiate le finanze rispetto all'anno scorso?",
    answer: (db, today) => {
      const year = yearOf(today);
      const stessoGiorno = `${year - 1}${today.slice(4)}`;
      const ora = computeTotals(movementsInYear(db.movimenti, year, today));
      const prima = computeTotals(movementsInYear(db.movimenti, year - 1, stessoGiorno));
      if (prima.entrate === 0 && prima.uscite === 0)
        return { text: `Non ci sono movimenti nel ${year - 1}: il confronto non è possibile.` };
      const d = (a: number, b: number) => {
        const p = deltaPercent(a, b);
        return p === null ? "non confrontabile" : `${p >= 0 ? "+" : ""}${p.toFixed(1).replace(".", ",")}%`;
      };
      return {
        text: `Confronto dal 1° gennaio a oggi, ${year} rispetto allo stesso periodo del ${year - 1}:`,
        items: [
          `Entrate: ${formatEUR(ora.entrate)} contro ${formatEUR(prima.entrate)} (${d(ora.entrate, prima.entrate)})`,
          `Uscite: ${formatEUR(ora.uscite)} contro ${formatEUR(prima.uscite)} (${d(ora.uscite, prima.uscite)})`,
          `Risparmio: ${formatEUR(ora.risparmio)} contro ${formatEUR(prima.risparmio)} (${d(ora.risparmio, prima.risparmio)})`,
        ],
      };
    },
  },
];
