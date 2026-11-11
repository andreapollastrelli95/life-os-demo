// Date come stringhe ISO "AAAA-MM-GG": il confronto testuale coincide con quello
// cronologico e non ci sono slittamenti di fuso orario.

const DAY_MS = 86_400_000;

function toUTC(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Data odierna nel fuso italiano. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "GG/MM/AAAA" → ISO, oppure null se la data non esiste (es. 31/02/2026). */
export function parseDateIT(input: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [dd, mm, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const iso = `${m[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  if (mm < 1 || mm > 12 || dd < 1) return null;
  return fromUTC(Date.UTC(yyyy, mm - 1, dd)) === iso ? iso : null;
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((toUTC(toISO) - toUTC(fromISO)) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return fromUTC(toUTC(iso) + days * DAY_MS);
}

/** Aggiunge mesi fermandosi all'ultimo giorno disponibile (31/01 + 1 mese = 28/02). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return fromUTC(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), Math.min(d, lastDay)));
}

/** Prossima ricorrenza annuale di una data (es. compleanno) da oggi in poi. */
export function nextAnniversary(iso: string, today: string): string {
  const [, m, d] = iso.split("-");
  const fit = (year: number) => parseDateIT(`${d}/${m}/${year}`) ?? `${year}-02-28`; // 29/02
  const year = Number(today.slice(0, 4));
  const thisYear = fit(year);
  return thisYear >= today ? thisYear : fit(year + 1);
}

export const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
