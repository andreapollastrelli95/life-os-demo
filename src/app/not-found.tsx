import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-6 text-center">
      <h1 className="text-lg font-semibold text-night-900">Pagina non trovata</h1>
      <p className="mt-2 text-sm text-muted">L&apos;indirizzo non corrisponde a nessun modulo.</p>
      <Link href="/" className="btn btn-primary mt-4">Torna alla dashboard</Link>
    </div>
  );
}
