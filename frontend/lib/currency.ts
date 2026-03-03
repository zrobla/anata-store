function toIntegerAmount(value: number | string): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.trunc(value);
  }

  // Normalise toutes les variantes d'espaces et retire tout caractere non numerique.
  const cleaned = value.replace(/\s+/g, "").replace(/[^\d-]/g, "");
  if (!cleaned || cleaned === "-") {
    return 0;
  }
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const THOUSAND_SEPARATOR = "\u00A0\u00A0";

export function formatFcfa(value: number | string): string {
  const amount = toIntegerAmount(value);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
  return `${sign}${grouped} FCFA`;
}
