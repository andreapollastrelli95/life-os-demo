"use client";

import { Bot } from "lucide-react";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Badge, ComingSoon, PageHeader } from "@/components/ui";
import { QUESTIONS, type Answer } from "@/lib/domain/assistant";
import { isDemo } from "@/lib/types";

interface Exchange {
  id: number;
  question: string;
  answer: Answer;
}

export default function AssistentePage() {
  const { db, today } = useData();
  const [history, setHistory] = useState<Exchange[]>([]);

  const ask = (questionId: string) => {
    const q = QUESTIONS.find((x) => x.id === questionId)!;
    setHistory((h) => [{ id: h.length + 1, question: q.label, answer: q.answer(db, today) }, ...h]);
  };

  return (
    <>
      <PageHeader title="Assistente AI" description="Risposte calcolate dai dati dei moduli.">
        <Badge tone="warn">Domande predefinite</Badge>
      </PageHeader>

      <p className="mb-4 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
        Non è un&apos;intelligenza artificiale: risponde solo alle domande qui sotto, con calcoli
        sui {isDemo(db) ? "dati demo" : "tuoi dati"}. Nessun dato esce dal computer e la sezione Salute non viene letta.
      </p>

      <div className="flex flex-wrap gap-2">
        {QUESTIONS.map((q) => (
          <button key={q.id} type="button" className="btn" onClick={() => ask(q.id)}>{q.label}</button>
        ))}
      </div>

      <div className="mt-5 space-y-3" aria-live="polite">
        {history.length === 0 && <p className="text-sm text-muted">Scegli una domanda per iniziare.</p>}
        {history.map((e) => (
          <article key={e.id} className="card p-4">
            <p className="text-sm font-semibold text-night-900">{e.question}</p>
            <div className="mt-2 flex gap-2.5">
              <Bot className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <div className="text-sm">
                <p>{e.answer.text}</p>
                {e.answer.items && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                    {e.answer.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5"><ComingSoon label="Domande libere con un provider AI" /></div>
    </>
  );
}
