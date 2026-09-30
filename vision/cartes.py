"""Constantes des cartes et rendu de cartes synthétiques (mode démo et modèles de reconnaissance)."""

import cv2
import numpy as np

# Mêmes noms que le backend (backend/jeux/blackjack.js)
RANGS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
COULEURS = ["pique", "coeur", "carreau", "trefle"]
ROUGES = {"coeur", "carreau"}
SYMBOLES = {"pique": "P", "coeur": "C", "carreau": "K", "trefle": "T"}

LARGEUR, HAUTEUR = 200, 300

# Coin d'index (rang au-dessus de la couleur), en fraction de la carte redressée
COIN_LARGEUR, COIN_HAUTEUR = 0.25, 0.34

ROUGE = (30, 30, 200)
NOIR = (25, 25, 25)


def nom_carte(rang, couleur):
    return f"{rang}{SYMBOLES[couleur]}"


def _coeur(img, x, y, t, couleur):
    r = t // 4
    cv2.circle(img, (x + r, y + r), r, couleur, -1, cv2.LINE_AA)
    cv2.circle(img, (x + 3 * r, y + r), r, couleur, -1, cv2.LINE_AA)
    pts = np.array([[x + 1, y + int(r * 1.4)], [x + t - 1, y + int(r * 1.4)], [x + t // 2, y + t]], np.int32)
    cv2.fillPoly(img, [pts], couleur, cv2.LINE_AA)


def _pique(img, x, y, t, couleur):
    r = t // 4
    tete = int(t * 0.8)
    pts = np.array([[x + t // 2, y], [x + 1, y + int(tete * 0.62)], [x + t - 1, y + int(tete * 0.62)]], np.int32)
    cv2.fillPoly(img, [pts], couleur, cv2.LINE_AA)
    cv2.circle(img, (x + r, y + int(tete * 0.62)), r, couleur, -1, cv2.LINE_AA)
    cv2.circle(img, (x + 3 * r, y + int(tete * 0.62)), r, couleur, -1, cv2.LINE_AA)
    _pied(img, x, y, t, couleur)


def _trefle(img, x, y, t, couleur):
    r = int(t * 0.22)
    cv2.circle(img, (x + t // 2, y + r), r, couleur, -1, cv2.LINE_AA)
    cv2.circle(img, (x + r, y + int(t * 0.55)), r, couleur, -1, cv2.LINE_AA)
    cv2.circle(img, (x + t - r, y + int(t * 0.55)), r, couleur, -1, cv2.LINE_AA)
    cv2.circle(img, (x + t // 2, y + int(t * 0.5)), r // 2, couleur, -1, cv2.LINE_AA)
    _pied(img, x, y, t, couleur)


def _pied(img, x, y, t, couleur):
    pts = np.array([[x + t // 2, y + int(t * 0.5)], [x + int(t * 0.28), y + t], [x + int(t * 0.72), y + t]], np.int32)
    cv2.fillPoly(img, [pts], couleur, cv2.LINE_AA)


def _carreau(img, x, y, t, couleur):
    pts = np.array([[x + t // 2, y], [x + int(t * 0.9), y + t // 2], [x + t // 2, y + t], [x + int(t * 0.1), y + t // 2]], np.int32)
    cv2.fillPoly(img, [pts], couleur, cv2.LINE_AA)


DESSINS = {"pique": _pique, "coeur": _coeur, "carreau": _carreau, "trefle": _trefle}


def dessiner_couleur(img, couleur, x, y, taille):
    DESSINS[couleur](img, x, y, taille, ROUGE if couleur in ROUGES else NOIR)


def _texte_dans_boite(img, texte, x, y, largeur, hauteur, couleur):
    police, epaisseur = cv2.FONT_HERSHEY_DUPLEX, 3
    (l, h), _ = cv2.getTextSize(texte, police, 1.0, epaisseur)
    echelle = min(largeur / l, hauteur / h)
    (l, h), _ = cv2.getTextSize(texte, police, echelle, epaisseur)
    cv2.putText(img, texte, (x + (largeur - l) // 2, y + h), police, echelle, couleur, epaisseur, cv2.LINE_AA)


def dessiner_carte(rang, couleur):
    """Carte redressée LARGEUR x HAUTEUR, index en haut à gauche et en bas à droite."""
    img = np.full((HAUTEUR, LARGEUR, 3), 250, np.uint8)
    teinte = ROUGE if couleur in ROUGES else NOIR

    coin = np.full((int(HAUTEUR * COIN_HAUTEUR), int(LARGEUR * COIN_LARGEUR), 3), 250, np.uint8)
    _texte_dans_boite(coin, rang, 4, 6, 40, 44, teinte)
    dessiner_couleur(coin, couleur, 8, 60, 34)
    h, l = coin.shape[:2]
    img[:h, :l] = coin
    img[HAUTEUR - h:, LARGEUR - l:] = cv2.rotate(coin, cv2.ROTATE_180)

    if rang in ("J", "Q", "K"):
        cv2.rectangle(img, (62, 85), (138, 215), teinte, 3)
        _texte_dans_boite(img, rang, 72, 110, 56, 70, teinte)
    else:
        dessiner_couleur(img, couleur, 65, 115, 70)

    cv2.rectangle(img, (0, 0), (LARGEUR - 1, HAUTEUR - 1), (180, 180, 180), 2)
    return img
