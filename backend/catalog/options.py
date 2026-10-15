"""Couleurs et capacites proposees au gerant quand il cree un article.

Les deux ne jouent pas le meme role:

- les **couleurs** sont une caracteristique affichee (meme prix, meme stock);
- les **capacites** peuvent porter un prix: un 512 Go ne se vend pas au prix d'un
  128 Go. Quand le gerant saisit une grille de prix, chaque capacite devient une
  declinaison vendable (cf. `article_service.sync_capacites`). Sans grille, la
  capacite reste une simple caracteristique affichee.

Le referentiel est servi par l'API pour que le studio n'ait rien a coder en dur.
"""

from __future__ import annotations

from catalog.models import Product

# Cle d'attribut historique du catalogue (import Excel, produits existants).
CLE_COULEUR = "color"
CLE_CAPACITE = "storage"

COULEURS: list[dict[str, str]] = [
    {"valeur": "Noir", "code": "#111827"},
    {"valeur": "Blanc", "code": "#F5F7FA"},
    {"valeur": "Gris", "code": "#6B7280"},
    {"valeur": "Gris sideral", "code": "#434A54", "libelle": "Gris sidéral"},
    {"valeur": "Argent", "code": "#D3D7DD"},
    {"valeur": "Titane", "code": "#8B8D92"},
    {"valeur": "Or", "code": "#D4AF6A"},
    {"valeur": "Rose", "code": "#E9B4C1"},
    {"valeur": "Rouge", "code": "#C0392B"},
    {"valeur": "Bleu", "code": "#2563EB"},
    {"valeur": "Bleu nuit", "code": "#1E293B"},
    {"valeur": "Vert", "code": "#15803D"},
    {"valeur": "Violet", "code": "#7C3AED"},
    {"valeur": "Jaune", "code": "#EAB308"},
    {"valeur": "Orange", "code": "#EA580C"},
    {"valeur": "Beige", "code": "#E3D8C5"},
]

CAPACITES: list[str] = ["32 Go", "64 Go", "128 Go", "256 Go", "512 Go", "1 To"]

MAX_VALEURS = 16

# Le catalogue importe contient « 256GB », « 1TB »... On les ramene a la forme
# affichee au client, sinon la meme capacite apparaitrait sous deux libelles.
_ALIAS_CAPACITES = {
    "32go": "32 Go",
    "32gb": "32 Go",
    "64go": "64 Go",
    "64gb": "64 Go",
    "128go": "128 Go",
    "128gb": "128 Go",
    "256go": "256 Go",
    "256gb": "256 Go",
    "512go": "512 Go",
    "512gb": "512 Go",
    "1to": "1 To",
    "1tb": "1 To",
    "1024go": "1 To",
    "1024gb": "1 To",
}


def _libelle_couleur(entree: dict[str, str]) -> str:
    return entree.get("libelle") or entree["valeur"]


def referentiel() -> dict[str, list]:
    """Ce que le studio affiche au gerant: pastilles de couleur et capacites."""
    return {
        "couleurs": [
            {"valeur": entree["valeur"], "libelle": _libelle_couleur(entree), "code": entree["code"]}
            for entree in COULEURS
        ],
        "capacites": list(CAPACITES),
    }


def code_couleur(nom: str) -> str:
    """Pastille a afficher. Vide pour une couleur heritee hors referentiel."""
    recherche = (nom or "").strip().casefold()
    for entree in COULEURS:
        if recherche in {entree["valeur"].casefold(), _libelle_couleur(entree).casefold()}:
            return entree["code"]
    return ""


def _index_couleurs() -> dict[str, str]:
    index: dict[str, str] = {}
    for entree in COULEURS:
        index[entree["valeur"].casefold()] = entree["valeur"]
        index[_libelle_couleur(entree).casefold()] = entree["valeur"]
    return index


def _normaliser(valeurs, index: dict[str, str], etiquette: str) -> list[str]:
    if valeurs is None:
        return []
    if isinstance(valeurs, str) or not hasattr(valeurs, "__iter__"):
        raise ValueError(f"Les {etiquette} doivent etre envoyees sous forme de liste.")

    retenues: list[str] = []
    for brute in valeurs:
        texte = str(brute).strip()
        if not texte:
            continue
        connue = index.get(texte.casefold())
        if connue is None:
            raise ValueError(f"« {texte} » ne fait pas partie des {etiquette} proposees.")
        if connue not in retenues:
            retenues.append(connue)

    if len(retenues) > MAX_VALEURS:
        raise ValueError(f"Vous ne pouvez pas choisir plus de {MAX_VALEURS} {etiquette}.")
    return retenues


def normaliser_couleurs(valeurs) -> list[str]:
    return _normaliser(valeurs, _index_couleurs(), "couleurs")


def _index_capacites() -> dict[str, str]:
    index = {capacite.casefold(): capacite for capacite in CAPACITES}
    index.update(_ALIAS_CAPACITES)
    index.update({capacite.replace(" ", "").casefold(): capacite for capacite in CAPACITES})
    return index


def normaliser_capacites(valeurs) -> list[str]:
    return _normaliser(valeurs, _index_capacites(), "capacites")


def capacite_canonique(valeur) -> str | None:
    """« 256GB », « 256 go », « 1TB »... -> « 256 Go », « 1 To ». None si inconnue.

    Sert a reconnaitre la capacite d'une declinaison existante, quelle que soit
    l'ecriture utilisee a l'import.
    """
    texte = str(valeur or "").strip()
    if not texte:
        return None
    index = _index_capacites()
    return index.get(texte.casefold()) or index.get(texte.replace(" ", "").casefold())


def rang_capacite(capacite: str) -> int:
    """Ordre d'affichage: du plus petit au plus grand stockage."""
    try:
        return CAPACITES.index(capacite)
    except ValueError:
        return len(CAPACITES)


def _depuis_variantes(product: Product) -> dict[str, list[str]]:
    """Articles importes avant cette fonctionnalite: on lit leurs declinaisons."""
    couleurs: list[str] = []
    capacites: list[str] = []
    for variant in product.variants.all():
        for attribut in variant.attribute_values.all():
            valeur = (attribut.label or attribut.value).strip()
            if not valeur:
                continue
            if attribut.attribute_key == CLE_COULEUR and valeur not in couleurs:
                couleurs.append(valeur)
            elif attribut.attribute_key == CLE_CAPACITE:
                normalisee = capacite_canonique(valeur) or valeur
                if normalisee not in capacites:
                    capacites.append(normalisee)
    return {"couleurs": couleurs, "capacites": capacites}


def options_effectives(product: Product) -> dict[str, list[str]]:
    """Les choix du gerant s'il en a fait, sinon ce que disent les declinaisons."""
    stockees = product.options if isinstance(product.options, dict) else {}
    couleurs = [valeur for valeur in stockees.get("couleurs", []) or [] if valeur]
    capacites = [valeur for valeur in stockees.get("capacites", []) or [] if valeur]

    if couleurs and capacites:
        return {"couleurs": couleurs, "capacites": capacites}

    heritees = _depuis_variantes(product)
    return {
        "couleurs": couleurs or heritees["couleurs"],
        "capacites": capacites or heritees["capacites"],
    }
