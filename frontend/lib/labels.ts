const AVAILABILITY_LABELS: Record<string, string> = {
  IN_STOCK: "En stock",
  AVAILABLE_SOON: "Disponible bientot",
  OUT_OF_STOCK: "Rupture de stock"
};

export function availabilityLabel(status: string): string {
  return AVAILABILITY_LABELS[status] || status.replaceAll("_", " ").toLowerCase();
}
