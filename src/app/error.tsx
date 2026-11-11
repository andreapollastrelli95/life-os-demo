"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-6 text-center">
      <h1 className="text-lg font-semibold text-night-900">Si è verificato un errore</h1>
      <p className="mt-2 text-sm text-muted">La pagina non è stata caricata. I dati salvati non sono stati modificati.</p>
      <button type="button" className="btn btn-primary mt-4" onClick={reset}>Riprova</button>
    </div>
  );
}
