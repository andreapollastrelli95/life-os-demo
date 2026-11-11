"use client";

import "./globals.css";

/** Errore imprevisto in tutta l'app. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="it">
      <body>
        <div className="card mx-auto mt-16 max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold text-night-900">LIFE OS ha avuto un problema</h1>
          <p className="mt-2 text-sm text-muted">I dati salvati non sono stati toccati. Riprova o ricarica la pagina.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" className="btn" onClick={reset}>Riprova</button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Ricarica</button>
          </div>
        </div>
      </body>
    </html>
  );
}
