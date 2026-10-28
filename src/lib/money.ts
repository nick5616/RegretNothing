/** Parses "$1,299.99", "49", "49.5" into cents. Returns null for blank or unparseable input. */
export function parseDollars(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned || !/^\d*(\.\d*)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

// The fractions people actually say out loud.
const FRACTIONS: [number, string][] = [
  [1 / 10, "a tenth"], [1 / 8, "an eighth"], [1 / 6, "a sixth"], [1 / 5, "a fifth"], [1 / 4, "a quarter"],
  [1 / 3, "a third"], [2 / 5, "two fifths"], [1 / 2, "half"], [3 / 5, "three fifths"], [2 / 3, "two thirds"],
  [3 / 4, "three quarters"], [4 / 5, "four fifths"],
];

/**
 * Says how much of a gift a pledge covers the way a person would: "a fifth", "about two thirds",
 * "all", or a percentage when no common fraction is close. Reads after "You're giving X ___ of".
 */
export function shareWords(partCents: number, wholeCents: number): string {
  const share = Math.min(1, partCents / wholeCents);
  if (share >= 0.995) return "all";
  const [value, word] = FRACTIONS.reduce((a, b) => (Math.abs(b[0] - share) < Math.abs(a[0] - share) ? b : a));
  const off = Math.abs(value - share);
  if (off > 0.02) return share < 0.01 ? "a sliver" : `${Math.round(share * 100)}%`;
  return off > 0.004 ? `about ${word}` : word;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
