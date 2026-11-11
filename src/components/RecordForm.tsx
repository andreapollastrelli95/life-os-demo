"use client";

import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { saveAction } from "@/app/actions";
import type { Db } from "@/lib/types";
import { COLLECTIONS } from "@/modules/collections";
import {
  emptyFormValues, parseRecord, toFormValues, type CollectionConfig, type Field, type FormValues, type Row,
} from "@/modules/engine";
import { useData } from "./DataProvider";
import { useToast } from "./Toast";
import { ComingSoon, Modal } from "./ui";

function relationOptions(f: Field, db: Db) {
  const rows = db[f.relation!] as unknown as Row[];
  const config = COLLECTIONS[f.relation!];
  return rows
    .map((r) => ({ value: r.id, label: config.label(r, db) }))
    .sort((a, b) => a.label.localeCompare(b.label, "it"));
}

interface Props {
  config: CollectionConfig;
  row: Row | null;
  preset?: Record<string, string>;
  onClose: () => void;
}

export function RecordForm({ config, row, preset, onClose }: Props) {
  const { db, today } = useData();
  const notify = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const resolver: Resolver<FormValues> = (values) => {
    const result = parseRecord(config, values);
    if (result.ok) return { values, errors: {} };
    return {
      values: {},
      errors: Object.fromEntries(
        Object.entries(result.errors).map(([k, message]) => [k, { type: "validate", message }]),
      ),
    };
  };

  const { register, handleSubmit, setError, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: row ? toFormValues(config, row) : emptyFormValues(config, today, preset),
    resolver,
  });
  const values = useWatch({ control }) as FormValues;

  const onSubmit = async (raw: FormValues) => {
    setFormError(null);
    try {
      const result = await saveAction(config.key, row?.id ?? null, raw);
      if (result.ok) {
        notify("success", row ? "Modifiche salvate" : `Aggiunto: ${raw[config.fields[0].key] || config.singular}`);
        onClose();
        return;
      }
      setFormError(result.error);
      for (const [key, message] of Object.entries(result.fieldErrors ?? {})) setError(key, { message });
    } catch {
      setFormError("Salvataggio non riuscito. Controlla che l'app sia in esecuzione e riprova.");
    }
  };

  const visibleFields = config.fields.filter((f) => !f.visibleWhen || f.visibleWhen(values));
  const prefix = row ? "Modifica" : config.feminine ? "Nuova" : "Nuovo";

  return (
    <Modal title={`${prefix} ${config.singular}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleFields.map((f) => {
            const id = `f-${f.key}`;
            const error = errors[f.key]?.message;
            const describedBy = error ? `${id}-err` : f.help ? `${id}-help` : undefined;
            const common = {
              id, className: "input", "aria-invalid": !!error, "aria-describedby": describedBy, ...register(f.key),
            };
            return (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor={id}>
                  {f.label}{f.required && <span className="text-bad" aria-hidden> *</span>}
                </label>
                {f.type === "textarea" && <textarea rows={3} {...common} />}
                {f.type === "select" && (
                  <select {...common}>
                    <option value="">Seleziona…</option>
                    {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {f.type === "relation" && (
                  <select {...common}>
                    <option value="">Seleziona…</option>
                    {relationOptions(f, db).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {f.type !== "textarea" && f.type !== "select" && f.type !== "relation" && (
                  <input {...common} type={f.type === "email" ? "email" : "text"} autoComplete="off"
                    inputMode={f.type === "money" || f.type === "number" ? "decimal" : undefined}
                    placeholder={f.placeholder ?? (f.type === "date" ? "GG/MM/AAAA" : undefined)} />
                )}
                {error
                  ? <p id={`${id}-err`} className="mt-1 text-xs text-bad">{error}</p>
                  : f.help && <p id={`${id}-help`} className="mt-1 text-xs text-muted">{f.help}</p>}
              </div>
            );
          })}
        </div>

        {config.attachmentLabel && <div className="mt-4"><ComingSoon label={config.attachmentLabel} /></div>}
        {formError && <p role="alert" className="mt-4 rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">{formError}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
