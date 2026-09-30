"""Génère les modèles de reconnaissance du jeu de cartes de démonstration (modeles/demo)."""

from pathlib import Path

import cv2

from cartes import COULEURS, RANGS, dessiner_carte
from detecteur import extraire_index

DOSSIER = Path(__file__).parent / "modeles" / "demo"


def main():
    (DOSSIER / "rangs").mkdir(parents=True, exist_ok=True)
    (DOSSIER / "couleurs").mkdir(parents=True, exist_ok=True)
    for rang in RANGS:
        masque_rang, _, _ = extraire_index(dessiner_carte(rang, "pique"))
        cv2.imwrite(str(DOSSIER / "rangs" / f"{rang}.png"), masque_rang)
    for couleur in COULEURS:
        _, masque_couleur, _ = extraire_index(dessiner_carte("5", couleur))
        cv2.imwrite(str(DOSSIER / "couleurs" / f"{couleur}.png"), masque_couleur)
    print(f"Modèles enregistrés dans {DOSSIER}")


if __name__ == "__main__":
    main()
