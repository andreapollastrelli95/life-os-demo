"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error";
interface ToastItem { id: number; kind: ToastKind; message: string }

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, kind, message }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto">
        {items.map((t) => (
          <div key={t.id} role="status"
            className="card flex max-w-sm items-start gap-2 px-3 py-2.5 text-sm shadow-lg">
            {t.kind === "success"
              ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
              : <XCircle className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
