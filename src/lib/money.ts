// Money helpers — everything in the DB is in integer cents to avoid floats.

export function centsToDollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}$${dollars.toLocaleString()}.${remainder.toString().padStart(2, "0")}`;
}

export function centsToSignedDollars(cents: number): string {
  if (cents === 0) return "$0";
  const sign = cents > 0 ? "+" : "-";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}$${dollars.toLocaleString()}.${remainder.toString().padStart(2, "0")}`;
}

export function dollarsToCents(input: string | number): number | null {
  const trimmed = String(input).trim().replace(/[$,]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const num = parseFloat(trimmed);
  if (!isFinite(num)) return null;
  return Math.round(num * 100);
}
