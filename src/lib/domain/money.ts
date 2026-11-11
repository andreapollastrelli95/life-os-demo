// Importi: centesimi interi. Nessuna operazione passa dai float.

/** Formatta centesimi come "1.234,56 €" (Intl it-IT non raggruppa le 4 cifre). */
export function formatEUR(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const dec = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${euros},${dec} €`;
}

/** Centesimi → testo per un campo modulo ("1234,56"). */
export function centsToInput(cents: number | undefined | null): string {
  if (cents === undefined || cents === null) return "";
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dec = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${Math.floor(abs / 100)},${dec}`;
}

const MAX_CENTS = 99_999_999_999;

/**
 * Interpreta un importo scritto dall'utente: "1234,56", "1.234,56", "1234.56", "1.234".
 * Con la virgola i punti sono migliaia; senza virgola, un punto seguito da tre cifre è
 * un separatore di migliaia, altrimenti è il separatore decimale.
 * Restituisce centesimi interi, o null se il testo non è un importo valido.
 */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/\s|€/g, "");
  if (!s) return null;
  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);

  let intPart: string;
  let decPart = "";
  if (s.includes(",")) {
    if (!/^(\d{1,3}(\.\d{3})+|\d+),\d{0,2}$/.test(s)) return null;
    [intPart, decPart] = s.split(",");
    intPart = intPart.replace(/\./g, "");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    intPart = s.replace(/\./g, "");
  } else if (/^\d+(\.\d{1,2})?$/.test(s)) {
    [intPart, decPart = ""] = s.split(".");
  } else {
    return null;
  }

  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, "0") || 0);
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return negative ? -cents : cents;
}
