/** Parses "$1,299.99", "49", "49.5" into cents. Returns null for blank or unparseable input. */
export function parseDollars(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned || !/^\d*(\.\d*)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
