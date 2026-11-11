import { z } from "zod";
import { centsToInput, parseMoney } from "@/lib/domain/money";
import { formatDate, parseDateIT } from "@/lib/domain/dates";
import type { BaseRecord, CollectionKey, Db } from "@/lib/types";

// Motore generico: ogni collezione è descritta da una configurazione (campi, colonne,
// validazione). Form, tabella e validazione lato server derivano tutti da qui.

export type FormValues = Record<string, string>;
export type Row = BaseRecord & Record<string, unknown>;
export type CellValue = string | number | null | undefined;
export type Tone = "good" | "warn" | "bad" | "neutral";
export type Kind = "text" | "money" | "date" | "number" | "percent" | "badge";

export interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "email" | "money" | "number" | "date" | "time" | "select" | "relation";
  required?: boolean;
  options?: readonly string[];
  relation?: CollectionKey;
  min?: number;
  max?: number;
  /** Solo per `money`: ammette importi negativi. */
  signed?: boolean;
  placeholder?: string;
  help?: string;
  default?: string;
  defaultToday?: boolean;
  /** Il campo vale solo in certe condizioni: se nascosto, il valore viene scartato. */
  visibleWhen?: (values: FormValues) => boolean;
}

export interface Column<T> {
  key: string;
  label: string;
  kind?: Kind;
  get?: (row: T, db: Db, today: string) => CellValue;
  tone?: (value: CellValue, row: T, today: string) => Tone;
}

export interface RowAction<T> {
  id: string;
  label: string;
  visible: (row: T) => boolean;
  patch: Record<string, unknown>;
  success: string;
}

export interface CollectionConfig<T = Row> {
  key: CollectionKey;
  singular: string;
  plural: string;
  /** Genere del nome, per i messaggi ("nuovo"/"nuova"). */
  feminine?: boolean;
  fields: Field[];
  columns: Column<T>[];
  /** Campi `select` o `relation` offerti come filtro sopra la tabella. */
  filters: string[];
  defaultSort: { key: string; dir: "asc" | "desc" };
  label: (row: T, db: Db) => string;
  /** Regole tra più campi, valutate anche lato server. */
  validate?: (data: Record<string, unknown>) => { field: string; message: string }[];
  rowActions?: RowAction<T>[];
  attachmentLabel?: string;
}

function fieldSchema(f: Field) {
  const empty = (v: string | undefined) => v === undefined || v.trim() === "";
  const need = `${f.label}: campo obbligatorio`;

  return z.string().max(f.type === "textarea" ? 2000 : 300, `${f.label}: testo troppo lungo`).optional()
    .transform((v, ctx): string | number | undefined => {
      const fail = (message: string) => {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      };
      if (empty(v)) return f.required ? fail(need) : undefined;
      const value = v!.trim();

      switch (f.type) {
        case "money": {
          const cents = parseMoney(value);
          if (cents === null) return fail("Importo non valido. Esempio: 1.234,56");
          if (cents < 0 && !f.signed) return fail("L'importo non può essere negativo");
          return cents;
        }
        case "date":
          return parseDateIT(value) ?? fail("Data non valida. Usa il formato GG/MM/AAAA");
        case "number": {
          const n = Number(value.replace(",", "."));
          if (!Number.isFinite(n)) return fail("Numero non valido");
          if (f.min !== undefined && n < f.min) return fail(`Il valore minimo è ${f.min}`);
          if (f.max !== undefined && n > f.max) return fail(`Il valore massimo è ${f.max}`);
          return n;
        }
        case "time":
          return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fail("Ora non valida. Esempio: 14:30");
        case "email":
          return z.email().safeParse(value).success ? value : fail("Email non valida");
        case "select":
          return f.options!.includes(value) ? value : fail("Scegli un valore dall'elenco");
        default:
          return value;
      }
    });
}

export type ParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/** Valida i valori del modulo. Stessa funzione nel browser e sul server. */
export function parseRecord<T>(config: CollectionConfig<T>, raw: FormValues): ParseResult {
  // I campi nascosti non vengono né validati né salvati.
  const fields = config.fields.filter((f) => !f.visibleWhen || f.visibleWhen(raw));
  const schema = z.object(Object.fromEntries(fields.map((f) => [f.key, fieldSchema(f)])));
  const parsed = schema.safeParse(raw);

  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }

  const data = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  for (const { field, message } of config.validate?.(data) ?? []) errors[field] ??= message;
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}

export function toFormValues<T>(config: CollectionConfig<T>, row: T): FormValues {
  const r = row as Record<string, unknown>;
  const values: FormValues = {};
  for (const f of config.fields) {
    const v = r[f.key];
    if (v === undefined || v === null) values[f.key] = "";
    else if (f.type === "money") values[f.key] = centsToInput(v as number);
    else if (f.type === "date") values[f.key] = formatDate(v as string);
    else if (f.type === "number") values[f.key] = String(v).replace(".", ",");
    else values[f.key] = String(v);
  }
  return values;
}

export function emptyFormValues<T>(
  config: CollectionConfig<T>, today: string, preset?: Record<string, string>,
): FormValues {
  const values: FormValues = {};
  for (const f of config.fields) {
    values[f.key] = preset?.[f.key] ?? f.default ?? (f.defaultToday ? formatDate(today) : "");
  }
  return values;
}

/** Cancella i tipi specifici: fuori da `collections.ts` il motore lavora su `Row`. */
export function define<T extends BaseRecord>(config: CollectionConfig<T>): CollectionConfig<Row> {
  return config as unknown as CollectionConfig<Row>;
}
