"use client";

import { usePathname } from "next/navigation";

/**
 * Masque l'habillage de la boutique (en-tete, pied de page, bouton WhatsApp)
 * dans l'espace de gestion.
 *
 * Le gerant y travaille: melanger la navigation client et ses outils de gestion
 * prete a confusion, et le bouton WhatsApp client n'a aucun sens pour lui.
 */
export function ChromePublic({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  if (pathname === "/seller" || pathname.startsWith("/seller/")) {
    return null;
  }

  return <>{children}</>;
}

/** Conteneur principal: pleine largeur dans l'espace de gestion, centre ailleurs. */
export function ConteneurPrincipal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const studio = pathname === "/seller" || pathname.startsWith("/seller/");

  return (
    <main
      className={
        studio
          ? "mx-auto min-h-screen w-full max-w-7xl px-4 py-6"
          : "mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-6"
      }
    >
      {children}
    </main>
  );
}
