import { accountBalance, computeTotals, movementsInMonth } from "@/lib/domain/finance";
import { daysBetween } from "@/lib/domain/dates";
import { annualCost, monthlyCost } from "@/lib/domain/subscriptions";
import type {
  Abbonamento, Bene, Budget, CollectionKey, Contatto, Conto, Db, Documento, EventoSalute, Farmaco,
  Immobile, InterventoVeicolo, Investimento, Movimento, Obiettivo, Passivita, SpesaCasa, Veicolo,
  Viaggio, VoceAgenda,
} from "@/lib/types";
import { CATEGORIE_DOCUMENTO } from "@/lib/destinazioni";
import { define, type CollectionConfig, type Column, type Field, type Row, type Tone } from "./engine";

const NOTE: Field = { key: "note", label: "Note", type: "textarea" };

const METODI = ["Bonifico", "Carta di debito", "Carta di credito", "Addebito diretto", "Contanti", "Altro"] as const;
const CATEGORIE_SPESA = [
  "Alimentari", "Ristoranti e bar", "Casa", "Utenze", "Trasporti", "Salute", "Tecnologia", "Personale",
  "Abbigliamento", "Acquisti online", "Sport", "Tempo libero", "Viaggi", "Animali domestici", "Regali",
  "Rate e finanziamenti", "Imposte e commissioni", "Prelievi contanti",
  "Stipendio", "Investimenti", "Vendite online", "Altre entrate", "Altro",
] as const;

const lookup = <K extends CollectionKey>(key: K, id: unknown, db: Db): string => {
  const row = (db[key] as unknown as Row[]).find((r) => r.id === id);
  return row ? recordLabel(key, row, db) : "—";
};

/** Colonna data con evidenza: rosso se passata, arancione se entro 30 giorni. */
function deadlineColumn<T>(key: string, label: string): Column<T> {
  return {
    key, label, kind: "date",
    tone: (value, _row, today): Tone => {
      if (typeof value !== "string" || !value) return "neutral";
      const d = daysBetween(today, value);
      return d < 0 ? "bad" : d <= 30 ? "warn" : "neutral";
    },
  };
}

const conti = define<Conto>({
  key: "conti", singular: "conto", plural: "conti",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "istituto", label: "Istituto", type: "text" },
    { key: "tipologia", label: "Tipologia", type: "select", required: true, default: "Conto corrente",
      options: ["Conto corrente", "Conto deposito", "Carta di credito", "Carta prepagata", "Contanti", "Portafoglio digitale", "Altro"] },
    { key: "saldoIniziale", label: "Saldo iniziale (€)", type: "money", required: true, signed: true, placeholder: "0,00" },
    { key: "dataApertura", label: "Data di apertura", type: "date" },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "istituto", label: "Istituto" },
    { key: "tipologia", label: "Tipologia", kind: "badge" },
    { key: "saldoIniziale", label: "Saldo iniziale", kind: "money" },
    { key: "saldo", label: "Saldo attuale", kind: "money",
      get: (r, db, today) => accountBalance(r, db.movimenti, today),
      tone: (v) => (typeof v === "number" && v < 0 ? "bad" : "neutral") },
    { key: "dataApertura", label: "Apertura", kind: "date" },
  ],
  filters: ["tipologia"],
  defaultSort: { key: "nome", dir: "asc" },
  label: (r) => r.nome,
});

const movimenti = define<Movimento>({
  key: "movimenti", singular: "movimento", plural: "movimenti",
  fields: [
    { key: "tipo", label: "Tipo", type: "select", required: true, default: "Uscita",
      options: ["Entrata", "Uscita", "Trasferimento", "Rimborso", "Investimento"],
      help: "I trasferimenti non contano come entrate o uscite. I rimborsi riducono le uscite." },
    { key: "importo", label: "Importo (€)", type: "money", required: true, placeholder: "0,00" },
    { key: "data", label: "Data", type: "date", required: true, defaultToday: true },
    { key: "descrizione", label: "Descrizione", type: "text", required: true },
    { key: "contoId", label: "Conto", type: "relation", relation: "conti", required: true },
    { key: "contoDestinazioneId", label: "Conto di destinazione", type: "relation", relation: "conti", required: true,
      visibleWhen: (v) => v.tipo === "Trasferimento" },
    { key: "categoria", label: "Categoria", type: "select", options: CATEGORIE_SPESA,
      visibleWhen: (v) => v.tipo !== "Trasferimento" },
    { key: "sottocategoria", label: "Sottocategoria", type: "text" },
    { key: "metodoPagamento", label: "Metodo di pagamento", type: "select", options: METODI },
    { key: "viaggioId", label: "Viaggio collegato", type: "relation", relation: "viaggi",
      visibleWhen: (v) => v.tipo === "Uscita" || v.tipo === "Rimborso" },
    NOTE,
  ],
  columns: [
    { key: "data", label: "Data", kind: "date" },
    { key: "descrizione", label: "Descrizione" },
    { key: "tipo", label: "Tipo", kind: "badge" },
    { key: "categoria", label: "Categoria" },
    { key: "conto", label: "Conto",
      get: (r, db) => r.tipo === "Trasferimento"
        ? `${lookup("conti", r.contoId, db)} → ${lookup("conti", r.contoDestinazioneId, db)}`
        : lookup("conti", r.contoId, db) },
    { key: "importo", label: "Importo", kind: "money",
      get: (r) => (r.tipo === "Uscita" || r.tipo === "Investimento" ? -r.importo : r.importo),
      tone: (_v, r) => (r.tipo === "Entrata" || r.tipo === "Rimborso" ? "good" : "neutral") },
  ],
  filters: ["tipo", "categoria", "contoId"],
  defaultSort: { key: "data", dir: "desc" },
  label: (r) => r.descrizione,
  validate: (d) => {
    if (d.importo === 0) return [{ field: "importo", message: "L'importo deve essere maggiore di zero" }];
    if (d.tipo === "Trasferimento" && d.contoId === d.contoDestinazioneId)
      return [{ field: "contoDestinazioneId", message: "Il conto di destinazione deve essere diverso da quello di origine" }];
    return [];
  },
});

const budget = define<Budget>({
  key: "budget", singular: "budget", plural: "budget",
  fields: [
    { key: "categoria", label: "Categoria", type: "select", required: true, options: CATEGORIE_SPESA },
    { key: "limiteMensile", label: "Limite mensile (€)", type: "money", required: true },
    NOTE,
  ],
  columns: [
    { key: "categoria", label: "Categoria" },
    { key: "limiteMensile", label: "Limite mensile", kind: "money" },
    { key: "speso", label: "Spesa del mese", kind: "money",
      get: (r, db, today) => spentThisMonth(r, db, today) },
    { key: "differenza", label: "Differenza", kind: "money",
      get: (r, db, today) => r.limiteMensile - spentThisMonth(r, db, today),
      tone: (v) => (typeof v === "number" && v < 0 ? "bad" : "good") },
  ],
  filters: [],
  defaultSort: { key: "categoria", dir: "asc" },
  label: (r) => r.categoria,
});

function spentThisMonth(b: Budget, db: Db, today: string): number {
  const movs = movementsInMonth(db.movimenti, today.slice(0, 7)).filter((m) => m.categoria === b.categoria);
  return computeTotals(movs).uscite;
}

const passivita = define<Passivita>({
  key: "passivita", singular: "debito", plural: "prestiti e mutui",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "tipo", label: "Tipo", type: "select", required: true, default: "Prestito",
      options: ["Mutuo", "Prestito", "Finanziamento auto", "Debito personale"] },
    { key: "istituto", label: "Istituto o creditore", type: "text" },
    { key: "importoIniziale", label: "Importo iniziale (€)", type: "money", required: true },
    { key: "residuo", label: "Debito residuo (€)", type: "money", required: true,
      help: "Solo la quota a tuo carico: è il valore usato nel patrimonio netto." },
    { key: "rata", label: "Rata (€)", type: "money" },
    { key: "tasso", label: "Tasso (%)", type: "number", min: 0, max: 100 },
    { key: "dataFine", label: "Data di fine", type: "date" },
    { key: "immobileId", label: "Immobile collegato", type: "relation", relation: "immobili" },
    { key: "veicoloId", label: "Veicolo collegato", type: "relation", relation: "veicoli" },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo", kind: "badge" },
    { key: "residuo", label: "Residuo", kind: "money" },
    { key: "rata", label: "Rata", kind: "money" },
    { key: "tasso", label: "Tasso", kind: "percent" },
    { key: "dataFine", label: "Fine", kind: "date" },
  ],
  filters: ["tipo"],
  defaultSort: { key: "residuo", dir: "desc" },
  label: (r) => r.nome,
});

const documenti = define<Documento>({
  key: "documenti", singular: "documento", plural: "documenti",
  fields: [
    { key: "titolo", label: "Titolo", type: "text", required: true },
    { key: "categoria", label: "Categoria", type: "select", required: true, options: CATEGORIE_DOCUMENTO },
    { key: "numero", label: "Numero identificativo", type: "text" },
    { key: "dataEmissione", label: "Data di emissione", type: "date" },
    { key: "dataScadenza", label: "Data di scadenza", type: "date" },
    { key: "ente", label: "Ente emittente", type: "text" },
    { key: "tag", label: "Tag", type: "text", placeholder: "Separati da virgola" },
    NOTE,
  ],
  columns: [
    { key: "titolo", label: "Titolo" },
    { key: "categoria", label: "Categoria", kind: "badge" },
    { key: "ente", label: "Ente" },
    { key: "dataEmissione", label: "Emissione", kind: "date" },
    deadlineColumn("dataScadenza", "Scadenza"),
    { key: "tag", label: "Tag" },
  ],
  filters: ["categoria"],
  defaultSort: { key: "dataScadenza", dir: "asc" },
  label: (r) => r.titolo,
  validate: (d) =>
    d.dataEmissione && d.dataScadenza && (d.dataScadenza as string) < (d.dataEmissione as string)
      ? [{ field: "dataScadenza", message: "La scadenza non può precedere l'emissione" }] : [],
});

const immobili = define<Immobile>({
  key: "immobili", singular: "immobile", plural: "immobili",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "indirizzo", label: "Indirizzo", type: "text", required: true },
    { key: "tipologia", label: "Tipologia", type: "select", required: true, default: "Appartamento",
      options: ["Appartamento", "Casa indipendente", "Monolocale", "Box", "Terreno", "Altro"] },
    { key: "titolo", label: "Titolo", type: "select", required: true, default: "Proprietà", options: ["Proprietà", "Locazione"] },
    { key: "percentuale", label: "Percentuale di proprietà (%)", type: "number", required: true, min: 0, max: 100, default: "100" },
    { key: "valoreStimato", label: "Valore stimato (€)", type: "money", required: true },
    { key: "dataAcquisto", label: "Data di acquisto", type: "date" },
    { key: "prezzoAcquisto", label: "Prezzo di acquisto (€)", type: "money" },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "tipologia", label: "Tipologia" },
    { key: "titolo", label: "Titolo", kind: "badge" },
    { key: "percentuale", label: "Quota", kind: "percent" },
    { key: "valoreStimato", label: "Valore stimato", kind: "money" },
    { key: "mutuo", label: "Mutuo residuo", kind: "money",
      get: (r, db) => db.passivita.filter((p) => p.immobileId === r.id).reduce((s, p) => s + p.residuo, 0) },
    { key: "storico", label: "Spese registrate", kind: "money",
      get: (r, db) => db.speseCasa.filter((s) => s.immobileId === r.id).reduce((t, s) => t + s.importo, 0) },
  ],
  filters: ["titolo", "tipologia"],
  defaultSort: { key: "valoreStimato", dir: "desc" },
  label: (r) => r.nome,
});

const speseCasa = define<SpesaCasa>({
  key: "speseCasa", singular: "spesa", plural: "spese della casa", feminine: true,
  fields: [
    { key: "immobileId", label: "Immobile", type: "relation", relation: "immobili", required: true },
    { key: "tipo", label: "Tipo", type: "select", required: true, options: [
      "Luce", "Gas", "Acqua", "Internet", "TARI", "IMU", "Condominio", "Manutenzione", "Lavori", "Altro",
    ] },
    { key: "descrizione", label: "Descrizione", type: "text", required: true },
    { key: "importo", label: "Importo (€)", type: "money", required: true },
    { key: "data", label: "Data", type: "date", required: true, defaultToday: true },
    { key: "scadenza", label: "Scadenza del pagamento", type: "date" },
    { key: "stato", label: "Stato", type: "select", required: true, default: "Da pagare", options: ["Da pagare", "Pagata"] },
    { key: "fornitore", label: "Fornitore", type: "text" },
    { key: "movimentoId", label: "Movimento collegato", type: "relation", relation: "movimenti" },
    NOTE,
  ],
  columns: [
    { key: "data", label: "Data", kind: "date" },
    { key: "descrizione", label: "Descrizione" },
    { key: "immobile", label: "Immobile", get: (r, db) => lookup("immobili", r.immobileId, db) },
    { key: "tipo", label: "Tipo" },
    { key: "importo", label: "Importo", kind: "money" },
    deadlineColumn("scadenza", "Scadenza"),
    { key: "stato", label: "Stato", kind: "badge", tone: (v) => (v === "Pagata" ? "good" : "warn") },
  ],
  filters: ["immobileId", "tipo", "stato"],
  defaultSort: { key: "data", dir: "desc" },
  label: (r) => r.descrizione,
  rowActions: [{ id: "pagata", label: "Segna pagata", visible: (r) => r.stato === "Da pagare", patch: { stato: "Pagata" }, success: "Spesa segnata come pagata" }],
});

const veicoli = define<Veicolo>({
  key: "veicoli", singular: "veicolo", plural: "veicoli",
  fields: [
    { key: "marca", label: "Marca", type: "text", required: true },
    { key: "modello", label: "Modello", type: "text", required: true },
    { key: "targa", label: "Targa", type: "text", required: true },
    { key: "alimentazione", label: "Alimentazione", type: "select", required: true, default: "Benzina",
      options: ["Benzina", "Diesel", "GPL", "Metano", "Ibrida", "Elettrica", "Altro"] },
    { key: "dataImmatricolazione", label: "Data di immatricolazione", type: "date" },
    { key: "chilometraggio", label: "Chilometraggio", type: "number", min: 0 },
    { key: "valoreStimato", label: "Valore stimato (€)", type: "money", required: true },
    { key: "proprieta", label: "Proprietà", type: "select", required: true, default: "Proprietà", options: ["Proprietà", "Leasing", "Noleggio"] },
    { key: "scadenzaAssicurazione", label: "Scadenza assicurazione", type: "date" },
    { key: "scadenzaBollo", label: "Scadenza bollo", type: "date" },
    { key: "scadenzaRevisione", label: "Scadenza revisione", type: "date" },
    NOTE,
  ],
  columns: [
    { key: "veicolo", label: "Veicolo", get: (r) => `${r.marca} ${r.modello}` },
    { key: "targa", label: "Targa" },
    { key: "alimentazione", label: "Alimentazione" },
    { key: "chilometraggio", label: "Km", kind: "number" },
    { key: "proprieta", label: "Proprietà", kind: "badge" },
    { key: "valoreStimato", label: "Valore", kind: "money" },
    deadlineColumn("scadenzaAssicurazione", "Assicurazione"),
    deadlineColumn("scadenzaBollo", "Bollo"),
    deadlineColumn("scadenzaRevisione", "Revisione"),
  ],
  filters: ["alimentazione", "proprieta"],
  defaultSort: { key: "veicolo", dir: "asc" },
  label: (r) => `${r.marca} ${r.modello} (${r.targa})`,
});

const interventi = define<InterventoVeicolo>({
  key: "interventi", singular: "intervento", plural: "interventi e costi",
  fields: [
    { key: "veicoloId", label: "Veicolo", type: "relation", relation: "veicoli", required: true },
    { key: "tipo", label: "Tipo", type: "select", required: true, options: [
      "Tagliando", "Manutenzione", "Gomme", "Revisione", "Assicurazione", "Bollo", "Carburante",
      "Ricarica elettrica", "Multa", "Pedaggio", "Parcheggio", "Altro",
    ] },
    { key: "data", label: "Data", type: "date", required: true, defaultToday: true },
    { key: "chilometraggio", label: "Chilometraggio", type: "number", min: 0 },
    { key: "descrizione", label: "Descrizione", type: "text", required: true },
    { key: "costo", label: "Costo (€)", type: "money", required: true },
    { key: "officina", label: "Officina o fornitore", type: "text" },
    { key: "movimentoId", label: "Movimento collegato", type: "relation", relation: "movimenti" },
    NOTE,
  ],
  columns: [
    { key: "data", label: "Data", kind: "date" },
    { key: "veicolo", label: "Veicolo", get: (r, db) => lookup("veicoli", r.veicoloId, db) },
    { key: "tipo", label: "Tipo", kind: "badge" },
    { key: "descrizione", label: "Descrizione" },
    { key: "chilometraggio", label: "Km", kind: "number" },
    { key: "costo", label: "Costo", kind: "money" },
    { key: "officina", label: "Officina" },
  ],
  filters: ["veicoloId", "tipo"],
  defaultSort: { key: "data", dir: "desc" },
  label: (r) => r.descrizione,
});

const eventiSalute = define<EventoSalute>({
  key: "eventiSalute", singular: "evento", plural: "visite ed esami",
  fields: [
    { key: "tipo", label: "Tipo", type: "select", required: true, default: "Visita",
      options: ["Visita", "Esame", "Vaccinazione", "Prescrizione", "Altro"] },
    { key: "titolo", label: "Titolo", type: "text", required: true },
    { key: "data", label: "Data", type: "date", required: true, defaultToday: true },
    { key: "medico", label: "Medico", type: "text" },
    { key: "struttura", label: "Struttura", type: "text" },
    { key: "prossimoControllo", label: "Prossimo controllo", type: "date" },
    { key: "costo", label: "Costo (€)", type: "money" },
    NOTE,
  ],
  columns: [
    { key: "data", label: "Data", kind: "date" },
    { key: "titolo", label: "Titolo" },
    { key: "tipo", label: "Tipo", kind: "badge" },
    { key: "medico", label: "Medico" },
    { key: "struttura", label: "Struttura" },
    { key: "costo", label: "Costo", kind: "money" },
    deadlineColumn("prossimoControllo", "Prossimo controllo"),
  ],
  filters: ["tipo"],
  defaultSort: { key: "data", dir: "desc" },
  label: (r) => r.titolo,
});

const farmaci = define<Farmaco>({
  key: "farmaci", singular: "farmaco", plural: "farmaci",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "prescrittoDa", label: "Prescritto da", type: "text" },
    { key: "posologia", label: "Posologia indicata dal medico", type: "text" },
    { key: "dataInizio", label: "Data di inizio", type: "date" },
    { key: "dataFine", label: "Data di fine", type: "date" },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "prescrittoDa", label: "Prescritto da" },
    { key: "posologia", label: "Posologia" },
    { key: "dataInizio", label: "Inizio", kind: "date" },
    deadlineColumn("dataFine", "Fine"),
  ],
  filters: [],
  defaultSort: { key: "nome", dir: "asc" },
  label: (r) => r.nome,
});

const abbonamenti = define<Abbonamento>({
  key: "abbonamenti", singular: "abbonamento", plural: "abbonamenti e contratti",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "fornitore", label: "Fornitore", type: "text" },
    { key: "categoria", label: "Categoria", type: "select", required: true, options: [
      "Streaming", "Musica", "Telefonia", "Internet", "Luce e gas", "Acqua", "Banca", "Finanziamenti",
      "Palestra", "Software", "Assicurazioni", "Servizi cloud", "Altro",
    ] },
    { key: "costo", label: "Costo per periodo (€)", type: "money", required: true },
    { key: "frequenza", label: "Frequenza di pagamento", type: "select", required: true, default: "Mensile",
      options: ["Mensile", "Bimestrale", "Trimestrale", "Semestrale", "Annuale"] },
    { key: "dataInizio", label: "Data di inizio", type: "date" },
    { key: "dataRinnovo", label: "Prossimo rinnovo", type: "date" },
    { key: "dataScadenza", label: "Scadenza del contratto", type: "date" },
    { key: "metodoPagamento", label: "Metodo di pagamento", type: "select", options: METODI },
    { key: "stato", label: "Stato", type: "select", required: true, default: "Attivo", options: ["Attivo", "Sospeso", "Disdetto"] },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "categoria", label: "Categoria" },
    { key: "costo", label: "Costo", kind: "money" },
    { key: "frequenza", label: "Frequenza" },
    { key: "mensile", label: "Mensile equiv.", kind: "money", get: (r) => monthlyCost(r) },
    { key: "annuale", label: "Annuale equiv.", kind: "money", get: (r) => annualCost(r) },
    deadlineColumn("dataRinnovo", "Rinnovo"),
    { key: "stato", label: "Stato", kind: "badge", tone: (v) => (v === "Attivo" ? "good" : v === "Sospeso" ? "warn" : "neutral") },
  ],
  filters: ["stato", "categoria", "frequenza"],
  defaultSort: { key: "dataRinnovo", dir: "asc" },
  label: (r) => r.nome,
});

const beni = define<Bene>({
  key: "beni", singular: "bene", plural: "beni personali",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "categoria", label: "Categoria", type: "select", required: true, options: [
      "Elettronica", "Informatica", "Arredamento", "Abbigliamento", "Orologi", "Gioielli", "Elettrodomestici", "Attrezzature", "Altri beni",
    ] },
    { key: "marca", label: "Marca", type: "text" },
    { key: "modello", label: "Modello", type: "text" },
    { key: "dataAcquisto", label: "Data di acquisto", type: "date" },
    { key: "prezzo", label: "Prezzo (€)", type: "money" },
    { key: "valoreAttuale", label: "Valore attuale stimato (€)", type: "money" },
    { key: "scadenzaGaranzia", label: "Scadenza garanzia", type: "date" },
    { key: "seriale", label: "Numero seriale", type: "text" },
    { key: "negozio", label: "Negozio", type: "text" },
    { key: "movimentoId", label: "Movimento collegato", type: "relation", relation: "movimenti" },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "categoria", label: "Categoria", kind: "badge" },
    { key: "marca", label: "Marca" },
    { key: "dataAcquisto", label: "Acquisto", kind: "date" },
    { key: "prezzo", label: "Prezzo", kind: "money" },
    { key: "valoreAttuale", label: "Valore attuale", kind: "money" },
    deadlineColumn("scadenzaGaranzia", "Garanzia"),
  ],
  filters: ["categoria"],
  defaultSort: { key: "dataAcquisto", dir: "desc" },
  label: (r) => r.nome,
});

const agenda = define<VoceAgenda>({
  key: "agenda", singular: "voce", plural: "voci di agenda", feminine: true,
  fields: [
    { key: "titolo", label: "Titolo", type: "text", required: true },
    { key: "tipo", label: "Tipo", type: "select", required: true, default: "Attività", options: [
      "Appuntamento", "Commissione", "Attività", "Promemoria", "Ricorrenza", "Obiettivo", "Progetto", "Scadenza",
    ] },
    { key: "data", label: "Data", type: "date", required: true, defaultToday: true },
    { key: "ora", label: "Ora", type: "time", placeholder: "14:30" },
    { key: "priorita", label: "Priorità", type: "select", required: true, default: "Media", options: ["Bassa", "Media", "Alta"] },
    { key: "categoria", label: "Categoria", type: "text" },
    { key: "stato", label: "Stato", type: "select", required: true, default: "Da fare", options: ["Da fare", "Completata", "Annullata"] },
    { key: "ricorrenza", label: "Ricorrenza", type: "select", required: true, default: "Nessuna",
      options: ["Nessuna", "Ogni settimana", "Ogni mese", "Ogni trimestre", "Ogni anno"],
      help: "Per ora è solo un'annotazione: la voce non si ripete da sola." },
    { key: "descrizione", label: "Descrizione", type: "textarea" },
    NOTE,
  ],
  columns: [
    { key: "data", label: "Data", kind: "date" },
    { key: "ora", label: "Ora" },
    { key: "titolo", label: "Titolo" },
    { key: "tipo", label: "Tipo" },
    { key: "priorita", label: "Priorità", kind: "badge", tone: (v) => (v === "Alta" ? "bad" : v === "Media" ? "warn" : "neutral") },
    { key: "stato", label: "Stato", kind: "badge", tone: (v) => (v === "Completata" ? "good" : "neutral") },
  ],
  filters: ["stato", "priorita", "tipo"],
  defaultSort: { key: "data", dir: "asc" },
  label: (r) => r.titolo,
  rowActions: [{ id: "completa", label: "Completa", visible: (r) => r.stato === "Da fare", patch: { stato: "Completata" }, success: "Attività completata" }],
});

const viaggi = define<Viaggio>({
  key: "viaggi", singular: "viaggio", plural: "viaggi",
  fields: [
    { key: "destinazione", label: "Destinazione", type: "text", required: true },
    { key: "dataPartenza", label: "Partenza", type: "date", required: true },
    { key: "dataRitorno", label: "Ritorno", type: "date", required: true },
    { key: "partecipanti", label: "Partecipanti", type: "text" },
    { key: "budget", label: "Budget previsto (€)", type: "money", required: true },
    { key: "trasporti", label: "Trasporti", type: "text" },
    { key: "alloggio", label: "Hotel e alloggio", type: "text" },
    { key: "stato", label: "Stato", type: "select", required: true, default: "Pianificato", options: ["Pianificato", "Prenotato", "Concluso"] },
    NOTE,
  ],
  columns: [
    { key: "destinazione", label: "Destinazione" },
    { key: "dataPartenza", label: "Partenza", kind: "date" },
    { key: "dataRitorno", label: "Ritorno", kind: "date" },
    { key: "budget", label: "Budget", kind: "money" },
    { key: "effettive", label: "Spese effettive", kind: "money", get: (r, db) => tripCost(r.id, db) },
    { key: "scarto", label: "Scarto", kind: "money", get: (r, db) => r.budget - tripCost(r.id, db),
      tone: (v) => (typeof v === "number" && v < 0 ? "bad" : "neutral") },
    { key: "stato", label: "Stato", kind: "badge", tone: (v) => (v === "Concluso" ? "neutral" : "good") },
  ],
  filters: ["stato"],
  defaultSort: { key: "dataPartenza", dir: "desc" },
  label: (r) => r.destinazione,
  validate: (d) => (d.dataRitorno as string) < (d.dataPartenza as string)
    ? [{ field: "dataRitorno", message: "Il ritorno non può precedere la partenza" }] : [],
});

/** Spese effettive: movimenti collegati al viaggio. */
function tripCost(viaggioId: string, db: Db): number {
  return computeTotals(db.movimenti.filter((m) => m.viaggioId === viaggioId)).uscite;
}

const contatti = define<Contatto>({
  key: "contatti", singular: "contatto", plural: "contatti",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "cognome", label: "Cognome", type: "text" },
    { key: "telefono", label: "Telefono", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "indirizzo", label: "Indirizzo", type: "text" },
    { key: "categoria", label: "Categoria", type: "select", required: true, default: "Amici", options: [
      "Familiari", "Amici", "Professionisti", "Commercialista", "Avvocato", "Medico", "Artigiani", "Fornitori", "Altri",
    ] },
    { key: "azienda", label: "Azienda", type: "text" },
    { key: "compleanno", label: "Compleanno", type: "date" },
    NOTE,
  ],
  columns: [
    { key: "nominativo", label: "Nome", get: (r) => [r.nome, r.cognome].filter(Boolean).join(" ") },
    { key: "categoria", label: "Categoria", kind: "badge" },
    { key: "telefono", label: "Telefono" },
    { key: "email", label: "Email" },
    { key: "azienda", label: "Azienda" },
    { key: "compleanno", label: "Compleanno", kind: "date" },
  ],
  filters: ["categoria"],
  defaultSort: { key: "nominativo", dir: "asc" },
  label: (r) => [r.nome, r.cognome].filter(Boolean).join(" "),
});

const investimenti = define<Investimento>({
  key: "investimenti", singular: "investimento", plural: "investimenti",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "tipo", label: "Tipo", type: "select", required: true, default: "ETF",
      options: ["ETF", "Azioni", "Obbligazioni", "Fondi", "Previdenza", "Polizza", "Altro"] },
    { key: "istituto", label: "Istituto", type: "text" },
    { key: "capitaleInvestito", label: "Capitale investito (€)", type: "money", required: true },
    { key: "valoreAttuale", label: "Valore attuale (€)", type: "money", required: true, help: "Inserito a mano: non c'è alcun collegamento ai mercati." },
    { key: "dataValutazione", label: "Data di valutazione", type: "date", required: true, defaultToday: true },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo", kind: "badge" },
    { key: "capitaleInvestito", label: "Capitale", kind: "money" },
    { key: "valoreAttuale", label: "Valore attuale", kind: "money" },
    { key: "rendimento", label: "Differenza", kind: "money", get: (r) => r.valoreAttuale - r.capitaleInvestito,
      tone: (v) => (typeof v === "number" && v < 0 ? "bad" : "good") },
    { key: "dataValutazione", label: "Valutato il", kind: "date" },
  ],
  filters: ["tipo"],
  defaultSort: { key: "valoreAttuale", dir: "desc" },
  label: (r) => r.nome,
});

const obiettivi = define<Obiettivo>({
  key: "obiettivi", singular: "obiettivo", plural: "obiettivi",
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "importoTarget", label: "Importo obiettivo (€)", type: "money", required: true },
    { key: "importoAttuale", label: "Importo raggiunto (€)", type: "money", required: true, default: "0,00" },
    { key: "dataTarget", label: "Data obiettivo", type: "date" },
    NOTE,
  ],
  columns: [
    { key: "nome", label: "Nome" },
    { key: "importoTarget", label: "Obiettivo", kind: "money" },
    { key: "importoAttuale", label: "Raggiunto", kind: "money" },
    { key: "avanzamento", label: "Avanzamento", kind: "percent",
      get: (r) => (r.importoTarget > 0 ? Math.round((r.importoAttuale / r.importoTarget) * 100) : 0) },
    { key: "dataTarget", label: "Data obiettivo", kind: "date" },
  ],
  filters: [],
  defaultSort: { key: "dataTarget", dir: "asc" },
  label: (r) => r.nome,
});

export const COLLECTIONS: Record<CollectionKey, CollectionConfig<Row>> = {
  conti, movimenti, budget, passivita, documenti, immobili, speseCasa, veicoli, interventi,
  eventiSalute, farmaci, abbonamenti, beni, agenda, viaggi, contatti, investimenti, obiettivi,
};

export function recordLabel(key: CollectionKey, row: Row, db: Db): string {
  return COLLECTIONS[key].label(row, db);
}
