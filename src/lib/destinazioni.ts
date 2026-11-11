import type { CollectionKey } from "@/lib/types";

/** Dove può andare un file caricato: un modulo dell'app. */
export interface Destinazione {
  slug: string;
  label: string;
  hint: string;
  /** Se presente, il caricamento crea anche un record in questa collezione. */
  crea?: CollectionKey;
}

export const DESTINAZIONI: Destinazione[] = [
  { slug: "documenti", label: "Documenti", hint: "Carta d'identità, tessera sanitaria, certificati, contratti", crea: "documenti" },
  { slug: "finanze", label: "Finanze", hint: "Estratti conto, ricevute, contabili" },
  { slug: "patrimonio", label: "Patrimonio e futuro", hint: "Investimenti, previdenza, rendiconti titoli" },
  { slug: "casa", label: "Casa e immobili", hint: "Bollette, spese, lavori, contratti di casa" },
  { slug: "abbonamenti", label: "Abbonamenti e contratti", hint: "Contratti di fornitura, telefonia, assicurazioni" },
  { slug: "auto", label: "Auto e mobilità", hint: "Libretto, assicurazione, fatture dell'officina" },
  { slug: "salute", label: "Salute", hint: "Referti, prescrizioni, ricevute mediche" },
  { slug: "beni", label: "Beni personali", hint: "Fatture d'acquisto, garanzie, foto" },
  { slug: "viaggi", label: "Viaggi", hint: "Biglietti, prenotazioni, documenti di viaggio" },
];

export const CATEGORIE_DOCUMENTO = [
  "Carta d'identità", "Passaporto", "Patente", "Tessera sanitaria", "Documenti fiscali", "CU",
  "Dichiarazione dei redditi", "F24", "Contratti", "Certificazioni", "Bancari", "Immobiliari", "Assicurativi", "Altri",
] as const;

export const destinazioneLabel = (slug: string): string =>
  DESTINAZIONI.find((d) => d.slug === slug)?.label ?? slug;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
