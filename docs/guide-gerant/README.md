# Guide du gérant — version imprimable

- `guide-gerant.html` — source unique du document (mise en page A4, maquettes d'écrans dessinées en CSS).
- `Guide-Ma-Boutique-Anata-Store.pdf` — le fichier à transmettre à M. BAH (12 pages, A4).

Le contenu suit `GUIDE_GERANT_MA_BOUTIQUE.md` (racine du dépôt) en version enrichie :
couverture, sommaire, illustrations d'écrans, conseils photo, frise du parcours de commande,
FAQ et pense-bête. **Les identifiants ne sont volontairement pas imprimés** : la page 3 prévoit
un encadré à remplir à la main, et le mot de passe est transmis par un canal séparé.

Pour régénérer le PDF après modification du HTML :

```bash
cd docs/guide-gerant
chromium --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="Guide-Ma-Boutique-Anata-Store.pdf" "file://$PWD/guide-gerant.html"
exiftool -overwrite_original -Creator="Anata Store" -Producer="Anata Store" \
  -Title="Ma boutique — mode d'emploi (guide du gérant)" -Author="Anata Store" \
  -XMP:all= Guide-Ma-Boutique-Anata-Store.pdf
python3 -c "import pikepdf;f='Guide-Ma-Boutique-Anata-Store.pdf';p=pikepdf.open(f,allow_overwriting_input=True);p.save(f,linearize=True)"
```
