/**
 * Conversion entre le texte saisi par le gerant et le HTML stocke en base.
 *
 * Le gerant ecrit du texte normal, avec des lignes vides pour separer les
 * paragraphes. On genere un HTML volontairement pauvre (paragraphes et listes
 * a puces), ce qui evite toute injection et garde les pages coherentes.
 */

const BALISES_SIMPLES = /^(?:\s|<\/?(?:p|br|ul|ol|li|strong|em|b|i|h[23])(?:\s[^>]*)?\/?>|[^<>]*)*$/i;

function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** true si le HTML n'utilise que de la mise en forme basique, donc editable en texte. */
export function estHtmlSimple(html: string): boolean {
  if (!html.trim()) {
    return true;
  }
  if (/<\s*(script|style|iframe|table|div|span|img|a)\b/i.test(html)) {
    return false;
  }
  return BALISES_SIMPLES.test(html);
}

/** HTML -> texte editable. Les puces sont rendues par des tirets en debut de ligne. */
export function htmlVersTexte(html: string): string {
  if (!html.trim()) {
    return "";
  }

  return html
    .replace(/\r/g, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|ul|ol|h[23])\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Texte editable -> HTML. Une ligne vide separe deux paragraphes; « - » ouvre une liste. */
export function texteVersHtml(texte: string): string {
  const blocs = texte.replace(/\r/g, "").split(/\n\s*\n/).map((bloc) => bloc.trim()).filter(Boolean);

  return blocs
    .map((bloc) => {
      const lignes = bloc.split("\n").map((ligne) => ligne.trim()).filter(Boolean);
      const toutesEnPuces = lignes.length > 0 && lignes.every((ligne) => /^[-•*]\s+/.test(ligne));

      if (toutesEnPuces) {
        const elements = lignes
          .map((ligne) => `<li>${echapper(ligne.replace(/^[-•*]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${elements}</ul>`;
      }

      return `<p>${lignes.map(echapper).join("<br />")}</p>`;
    })
    .join("\n");
}
