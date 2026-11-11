import type { Db } from "@/lib/types";
import { daysBetween, nextAnniversary } from "./dates";

export interface Deadline {
  id: string;
  titolo: string;
  tipo: string;
  modulo: string;
  href: string;
  data: string;
  giorni: number;
  stato: "Scaduta" | "Entro 30 giorni" | "Entro 90 giorni" | "Più avanti";
}

function statoDi(giorni: number): Deadline["stato"] {
  if (giorni < 0) return "Scaduta";
  if (giorni <= 30) return "Entro 30 giorni";
  if (giorni <= 90) return "Entro 90 giorni";
  return "Più avanti";
}

/** Vista unica di tutte le date di scadenza dei moduli, dalla più vicina. */
export function collectDeadlines(db: Db, today: string): Deadline[] {
  const out: Deadline[] = [];
  const add = (
    id: string, titolo: string, tipo: string, modulo: string, href: string, data: string | undefined,
  ) => {
    if (!data) return;
    const giorni = daysBetween(today, data);
    out.push({ id, titolo, tipo, modulo, href, data, giorni, stato: statoDi(giorni) });
  };

  for (const d of db.documenti)
    add(`doc-${d.id}`, d.titolo, "Scadenza documento", "Documenti", "/documenti", d.dataScadenza);

  for (const a of db.abbonamenti) {
    if (a.stato !== "Attivo") continue;
    add(`abb-r-${a.id}`, a.nome, "Rinnovo", "Abbonamenti e contratti", "/abbonamenti", a.dataRinnovo);
    add(`abb-s-${a.id}`, a.nome, "Fine contratto", "Abbonamenti e contratti", "/abbonamenti", a.dataScadenza);
  }

  for (const v of db.veicoli) {
    const nome = `${v.marca} ${v.modello}`;
    add(`vei-a-${v.id}`, nome, "Assicurazione", "Auto e mobilità", "/auto", v.scadenzaAssicurazione);
    add(`vei-b-${v.id}`, nome, "Bollo", "Auto e mobilità", "/auto", v.scadenzaBollo);
    add(`vei-r-${v.id}`, nome, "Revisione", "Auto e mobilità", "/auto", v.scadenzaRevisione);
  }

  for (const s of db.speseCasa)
    if (s.stato === "Da pagare")
      add(`cas-${s.id}`, s.descrizione, "Pagamento", "Casa e immobili", "/casa?tab=speseCasa", s.scadenza);

  for (const b of db.beni)
    add(`ben-${b.id}`, b.nome, "Fine garanzia", "Beni personali", "/beni", b.scadenzaGaranzia);

  for (const e of db.eventiSalute)
    add(`sal-${e.id}`, e.titolo, "Prossimo controllo", "Salute", "/salute", e.prossimoControllo);

  for (const f of db.farmaci)
    add(`far-${f.id}`, f.nome, "Fine terapia", "Salute", "/salute?tab=farmaci", f.dataFine);

  for (const a of db.agenda)
    if (a.stato === "Da fare") add(`age-${a.id}`, a.titolo, a.tipo, "Agenda", "/agenda", a.data);

  for (const p of db.passivita)
    add(`pas-${p.id}`, p.nome, "Fine finanziamento", "Finanze", "/finanze?tab=passivita", p.dataFine);

  for (const v of db.viaggi)
    if (v.stato !== "Concluso") add(`via-${v.id}`, v.destinazione, "Partenza", "Viaggi", "/viaggi", v.dataPartenza);

  for (const o of db.obiettivi)
    if (o.importoAttuale < o.importoTarget)
      add(`obi-${o.id}`, o.nome, "Obiettivo", "Patrimonio e futuro", "/patrimonio?tab=obiettivi", o.dataTarget);

  for (const c of db.contatti)
    if (c.compleanno)
      add(`con-${c.id}`, [c.nome, c.cognome].filter(Boolean).join(" "), "Compleanno", "Rubrica", "/rubrica",
        nextAnniversary(c.compleanno, today));

  return out.sort((a, b) => a.data.localeCompare(b.data) || a.titolo.localeCompare(b.titolo));
}

/** Elementi del centro notifiche: scaduti o in arrivo entro 30 giorni. */
export function notificationsFrom(deadlines: Deadline[]): Deadline[] {
  return deadlines.filter((d) => d.giorni <= 30);
}
