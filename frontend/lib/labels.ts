const AVAILABILITY_LABELS: Record<string, string> = {
  IN_STOCK: "En stock",
  AVAILABLE_SOON: "Disponible bientôt",
  OUT_OF_STOCK: "Rupture de stock"
};

export function availabilityLabel(status: string): string {
  return AVAILABILITY_LABELS[status] || status.replaceAll("_", " ").toLowerCase();
}

/** Nom lisible d'une caracteristique de version (« storage » -> « Capacité »). */
const ATTRIBUT_LABELS: Record<string, string> = {
  storage: "Capacité",
  color: "Couleur",
  ram: "Mémoire vive",
  size: "Taille",
  network: "Réseau"
};

export function attributeLabel(key: string): string {
  return ATTRIBUT_LABELS[key] || key;
}
