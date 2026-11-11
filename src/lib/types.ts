// Modello dati di LIFE OS. Gli importi sono SEMPRE centesimi interi (mai float);
// le date sono stringhe ISO "AAAA-MM-GG", mostrate come GG/MM/AAAA.

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type TipoConto =
  | "Conto corrente"
  | "Conto deposito"
  | "Carta di credito"
  | "Carta prepagata"
  | "Contanti"
  | "Portafoglio digitale"
  | "Altro";

export interface Conto extends BaseRecord {
  nome: string;
  istituto?: string;
  tipologia: TipoConto;
  saldoIniziale: number;
  dataApertura?: string;
  note?: string;
}

export type TipoMovimento = "Entrata" | "Uscita" | "Trasferimento" | "Rimborso" | "Investimento";

export interface Movimento extends BaseRecord {
  tipo: TipoMovimento;
  importo: number;
  data: string;
  descrizione: string;
  categoria?: string;
  sottocategoria?: string;
  contoId: string;
  contoDestinazioneId?: string;
  metodoPagamento?: string;
  viaggioId?: string;
  note?: string;
}

export interface Budget extends BaseRecord {
  categoria: string;
  limiteMensile: number;
  note?: string;
}

export interface Passivita extends BaseRecord {
  nome: string;
  tipo: "Mutuo" | "Prestito" | "Finanziamento auto" | "Debito personale";
  istituto?: string;
  importoIniziale: number;
  residuo: number;
  rata?: number;
  tasso?: number;
  dataFine?: string;
  immobileId?: string;
  veicoloId?: string;
  note?: string;
}

export interface Documento extends BaseRecord {
  titolo: string;
  categoria: string;
  numero?: string;
  dataEmissione?: string;
  dataScadenza?: string;
  ente?: string;
  tag?: string;
  note?: string;
}

export interface Immobile extends BaseRecord {
  nome: string;
  indirizzo: string;
  tipologia: string;
  titolo: "Proprietà" | "Locazione";
  percentuale: number;
  valoreStimato: number;
  dataAcquisto?: string;
  prezzoAcquisto?: number;
  note?: string;
}

export interface SpesaCasa extends BaseRecord {
  immobileId: string;
  tipo: string;
  descrizione: string;
  importo: number;
  data: string;
  scadenza?: string;
  stato: "Da pagare" | "Pagata";
  fornitore?: string;
  movimentoId?: string;
  note?: string;
}

export interface Veicolo extends BaseRecord {
  marca: string;
  modello: string;
  targa: string;
  alimentazione: string;
  dataImmatricolazione?: string;
  chilometraggio?: number;
  valoreStimato: number;
  proprieta: "Proprietà" | "Leasing" | "Noleggio";
  scadenzaAssicurazione?: string;
  scadenzaBollo?: string;
  scadenzaRevisione?: string;
  note?: string;
}

export interface InterventoVeicolo extends BaseRecord {
  veicoloId: string;
  tipo: string;
  data: string;
  chilometraggio?: number;
  descrizione: string;
  costo: number;
  officina?: string;
  movimentoId?: string;
  note?: string;
}

export interface EventoSalute extends BaseRecord {
  tipo: string;
  titolo: string;
  data: string;
  medico?: string;
  struttura?: string;
  prossimoControllo?: string;
  costo?: number;
  note?: string;
}

export interface Farmaco extends BaseRecord {
  nome: string;
  prescrittoDa?: string;
  posologia?: string;
  dataInizio?: string;
  dataFine?: string;
  note?: string;
}

export type Frequenza = "Mensile" | "Bimestrale" | "Trimestrale" | "Semestrale" | "Annuale";

export interface Abbonamento extends BaseRecord {
  nome: string;
  fornitore?: string;
  categoria: string;
  costo: number;
  frequenza: Frequenza;
  dataInizio?: string;
  dataRinnovo?: string;
  dataScadenza?: string;
  metodoPagamento?: string;
  stato: "Attivo" | "Sospeso" | "Disdetto";
  note?: string;
}

export interface Bene extends BaseRecord {
  nome: string;
  categoria: string;
  marca?: string;
  modello?: string;
  dataAcquisto?: string;
  prezzo?: number;
  valoreAttuale?: number;
  scadenzaGaranzia?: string;
  seriale?: string;
  negozio?: string;
  movimentoId?: string;
  note?: string;
}

export interface VoceAgenda extends BaseRecord {
  titolo: string;
  tipo: string;
  descrizione?: string;
  data: string;
  ora?: string;
  priorita: "Bassa" | "Media" | "Alta";
  categoria?: string;
  stato: "Da fare" | "Completata" | "Annullata";
  ricorrenza: string;
  note?: string;
}

export interface Viaggio extends BaseRecord {
  destinazione: string;
  dataPartenza: string;
  dataRitorno: string;
  partecipanti?: string;
  budget: number;
  trasporti?: string;
  alloggio?: string;
  stato: "Pianificato" | "Prenotato" | "Concluso";
  note?: string;
}

export interface Contatto extends BaseRecord {
  nome: string;
  cognome?: string;
  telefono?: string;
  email?: string;
  indirizzo?: string;
  categoria: string;
  azienda?: string;
  compleanno?: string;
  note?: string;
}

export interface Investimento extends BaseRecord {
  nome: string;
  tipo: string;
  istituto?: string;
  capitaleInvestito: number;
  valoreAttuale: number;
  dataValutazione: string;
  note?: string;
}

export interface Obiettivo extends BaseRecord {
  nome: string;
  importoTarget: number;
  importoAttuale: number;
  dataTarget?: string;
  note?: string;
}

/** File caricato dall'utente e archiviato in `data/allegati`. */
export interface Allegato extends BaseRecord {
  /** Nome originale del file. */
  nome: string;
  /** Nome del file su disco, dentro `data/allegati`. */
  file: string;
  mime: string;
  dimensione: number;
  /** Modulo di destinazione (slug della pagina, es. "documenti"). */
  destinazione: string;
  titolo: string;
  note?: string;
  /** Record a cui il file è collegato, se esiste. */
  collezione?: CollectionKey;
  recordId?: string;
}

export interface Profilo {
  nome: string;
  codiceFiscale?: string;
  nascita?: string;
  residenza?: string;
  email?: string;
  telefono?: string;
}

export interface Meta {
  version: number;
  seededAt: string;
  /** `false` quando l'archivio contiene dati reali; assente o `true` per i dati demo. */
  demo?: boolean;
  profilo?: Profilo;
}

export interface Db {
  meta: Meta;
  conti: Conto[];
  movimenti: Movimento[];
  budget: Budget[];
  passivita: Passivita[];
  documenti: Documento[];
  immobili: Immobile[];
  speseCasa: SpesaCasa[];
  veicoli: Veicolo[];
  interventi: InterventoVeicolo[];
  eventiSalute: EventoSalute[];
  farmaci: Farmaco[];
  abbonamenti: Abbonamento[];
  beni: Bene[];
  agenda: VoceAgenda[];
  viaggi: Viaggio[];
  contatti: Contatto[];
  investimenti: Investimento[];
  obiettivi: Obiettivo[];
  /** Archivio dei file caricati: non è una collezione gestionale (niente form generico). */
  allegati: Allegato[];
}

export type CollectionKey = Exclude<keyof Db, "meta" | "allegati">;

export const isDemo = (db: Pick<Db, "meta">): boolean => db.meta.demo !== false;

export const COLLECTION_KEYS: CollectionKey[] = [
  "conti", "movimenti", "budget", "passivita", "documenti", "immobili", "speseCasa",
  "veicoli", "interventi", "eventiSalute", "farmaci", "abbonamenti", "beni", "agenda",
  "viaggi", "contatti", "investimenti", "obiettivi",
];
