export function formatFcfa(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.trunc(Math.abs(value));
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped} FCFA`;
}
