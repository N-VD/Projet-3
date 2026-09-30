"""Apprend les rangs et couleurs de VOTRE jeu de cartes (modeles/perso).

Posez UNE carte à plat sous la caméra, puis tapez son nom dans la fenêtre vidéo :
  1. le rang  : A 2 3 4 5 6 7 8 9, 0 pour 10, J Q K
  2. la couleur : P = pique, C = coeur, K = carreau, T = trèfle
La carte est enregistrée dès la couleur tapée. Retour arrière annule, Échap quitte.

Il faut au minimum un exemple de chaque rang (13) et de chaque couleur (4) : les manquants
sont affichés en haut. Plusieurs exemples par rang améliorent la reconnaissance.
"""

import argparse
from pathlib import Path

import cv2
import numpy as np

from cartes import COULEURS, RANGS, SYMBOLES
from detecteur import Detecteur, extraire_index, ordonner_coins, redresser
from serveur import SourceCamera, SourceEcran

DOSSIER = Path(__file__).parent / "modeles" / "perso"
COULEUR_PAR_LETTRE = {lettre: couleur for couleur, lettre in SYMBOLES.items()}
RANG_PAR_TOUCHE = {**{r: r for r in RANGS if len(r) == 1}, "0": "10"}
ECHAP, RETOUR_ARRIERE = 27, 8

JAUNE, VERT, ROUGE = (0, 215, 255), (60, 220, 60), (60, 60, 230)


def enregistrer(dossier, nom, masque):
    dossier.mkdir(parents=True, exist_ok=True)
    n = 1
    while (dossier / f"{nom}_{n}.png").exists():
        n += 1
    cv2.imwrite(str(dossier / f"{nom}_{n}.png"), masque)


def deja_appris(sous_dossier, noms):
    dossier = DOSSIER / sous_dossier
    return {nom for nom in noms if any(dossier.glob(f"{nom}_*.png"))}


def texte(image, message, y, couleur, echelle=0.9):
    cv2.putText(image, message, (12, y), cv2.FONT_HERSHEY_SIMPLEX, echelle, (0, 0, 0), 5, cv2.LINE_AA)
    cv2.putText(image, message, (12, y), cv2.FONT_HERSHEY_SIMPLEX, echelle, couleur, 2, cv2.LINE_AA)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", choices=["camera", "ecran"], default="camera")
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--ecran", default="0,0,1600,900")
    args = parser.parse_args()

    source = SourceCamera(args.camera) if args.source == "camera" else SourceEcran(args.ecran)
    # Le détecteur de démo sert seulement à trouver les contours des cartes
    chercheur = Detecteur(Path(__file__).parent / "modeles" / "demo")
    print(__doc__)

    rang_choisi = None
    dernier_message = ("", VERT)
    cv2.namedWindow("Calibration", cv2.WINDOW_NORMAL)

    while True:
        image = source.lire()
        if image is None:
            continue
        contours = chercheur.trouver_cartes(image)
        apercu = image.copy()
        cv2.drawContours(apercu, contours, -1, VERT, 4)

        index = None
        if len(contours) == 1:
            index = extraire_index(redresser(image, ordonner_coins(contours[0])))
        if index is not None:
            # Ce que la vision découpe dans le coin de la carte : rang à gauche, couleur à droite
            vignette = np.hstack([cv2.resize(index[0], (105, 165)), cv2.resize(index[1], (105, 165))])
            h, l = vignette.shape
            apercu[apercu.shape[0] - h - 70:apercu.shape[0] - 70, 10:10 + l] = cv2.cvtColor(vignette, cv2.COLOR_GRAY2BGR)

        rangs_manquants = [r for r in RANGS if r not in deja_appris("rangs", RANGS)]
        couleurs_manquantes = [c for c in COULEURS if c not in deja_appris("couleurs", COULEURS)]
        texte(apercu, f"Rangs a apprendre : {' '.join(rangs_manquants) or 'aucun'}", 40, JAUNE)
        texte(apercu, f"Couleurs a apprendre : {' '.join(SYMBOLES[c] for c in couleurs_manquantes) or 'aucune'}", 80, JAUNE)
        if len(contours) == 0:
            consigne, teinte = "Posez UNE carte sous la camera", ROUGE
        elif len(contours) > 1:
            consigne, teinte = f"{len(contours)} cartes vues : n'en laissez qu'une", ROUGE
        elif index is None:
            consigne, teinte = "Coin de la carte illisible : rapprochez ou eclairez", ROUGE
        elif rang_choisi is None:
            consigne, teinte = "Tapez le rang (A 2..9, 0=10, J Q K)", VERT
        else:
            consigne, teinte = f"Rang {rang_choisi} : tapez la couleur (P C K T)", VERT
        texte(apercu, consigne, apercu.shape[0] - 25, teinte, 1.1)
        if dernier_message[0]:
            texte(apercu, dernier_message[0], 120, dernier_message[1])
        cv2.imshow("Calibration", apercu)

        touche = cv2.waitKey(1) & 0xFF
        if touche == 255:
            continue
        if touche == ECHAP:
            break
        if touche == RETOUR_ARRIERE:
            rang_choisi = None
            continue
        lettre = chr(touche).upper()
        if rang_choisi is None:
            if lettre in RANG_PAR_TOUCHE:
                rang_choisi = RANG_PAR_TOUCHE[lettre]
        elif lettre in COULEUR_PAR_LETTRE:
            couleur = COULEUR_PAR_LETTRE[lettre]
            if index is None:
                dernier_message = ("Aucune carte lisible : rien enregistre", ROUGE)
            else:
                enregistrer(DOSSIER / "rangs", rang_choisi, index[0])
                enregistrer(DOSSIER / "couleurs", couleur, index[1])
                dernier_message = (f"Enregistre : {rang_choisi} de {couleur}", VERT)
                print(f"Enregistré : {rang_choisi} de {couleur}")
            rang_choisi = None

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
