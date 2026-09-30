"""Détection et reconnaissance des cartes dans une image (OpenCV, sans apprentissage).

1. Les cartes (blanches) sont séparées du tapis par seuillage, puis repérées comme des quadrilatères.
2. Chaque carte est redressée, et son coin d'index est découpé en rang (en haut) et couleur (en bas).
3. Rang et couleur sont comparés aux modèles enregistrés (modeles/<jeu>/rangs et couleurs).
"""

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from cartes import COIN_HAUTEUR, COIN_LARGEUR, COULEURS, HAUTEUR, LARGEUR, RANGS, ROUGES

TAILLE_RANG = (70, 110)
TAILLE_COULEUR = (70, 80)
ZOOM_COIN = 3

# Écart moyen maximal (0 = identique, 1 = inverse) pour accepter une reconnaissance
ECART_MAX_RANG = 0.28
ECART_MAX_COULEUR = 0.28


@dataclass
class Detection:
    rang: str
    couleur: str
    centre: tuple  # (x, y) en pixels
    contour: np.ndarray
    ecart: float


def ordonner_coins(pts):
    """4 coins dans le sens horaire, le côté court (haut de la carte) en premier."""
    pts = pts.reshape(4, 2).astype(np.float32)
    centre = pts.mean(axis=0)
    angles = np.arctan2(pts[:, 1] - centre[1], pts[:, 0] - centre[0])
    pts = pts[np.argsort(angles)]  # sens horaire dans le repère image
    pts = np.roll(pts, -int(np.argmin(pts.sum(axis=1))), axis=0)
    haut = np.linalg.norm(pts[1] - pts[0])
    cote = np.linalg.norm(pts[3] - pts[0])
    if haut > cote:  # carte posée à l'horizontale
        pts = np.roll(pts, -1, axis=0)
    return pts


def redresser(image, coins):
    destination = np.array([[0, 0], [LARGEUR - 1, 0], [LARGEUR - 1, HAUTEUR - 1], [0, HAUTEUR - 1]], np.float32)
    matrice = cv2.getPerspectiveTransform(coins, destination)
    return cv2.warpPerspective(image, matrice, (LARGEUR, HAUTEUR))


def _boite_englobante(contours):
    x0 = min(cv2.boundingRect(c)[0] for c in contours)
    y0 = min(cv2.boundingRect(c)[1] for c in contours)
    x1 = max(cv2.boundingRect(c)[0] + cv2.boundingRect(c)[2] for c in contours)
    y1 = max(cv2.boundingRect(c)[1] + cv2.boundingRect(c)[3] for c in contours)
    return x0, y0, x1, y1


def extraire_index(carte):
    """Découpe le coin d'une carte redressée. Retourne (masque_rang, masque_couleur, est_rouge) ou None."""
    coin = carte[: int(HAUTEUR * COIN_HAUTEUR), : int(LARGEUR * COIN_LARGEUR)]
    coin = cv2.resize(coin, None, fx=ZOOM_COIN, fy=ZOOM_COIN, interpolation=cv2.INTER_CUBIC)
    gris = cv2.cvtColor(coin, cv2.COLOR_BGR2GRAY)
    _, masque = cv2.threshold(cv2.GaussianBlur(gris, (5, 5), 0), 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    h, l = masque.shape
    contours, _ = cv2.findContours(masque, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # Ignore le bruit et ce qui touche le bord droit / bas (cadre des figures, symbole central)
    utiles = []
    for c in contours:
        x, y, lc, hc = cv2.boundingRect(c)
        if cv2.contourArea(c) < 0.004 * h * l:
            continue
        if x + lc >= l - 2 or y + hc >= h - 2:
            continue
        utiles.append(c)
    if len(utiles) < 2:
        return None

    # La couleur est la forme la plus basse; le rang regroupe les formes au-dessus (« 10 » = deux formes)
    couleur = max(utiles, key=lambda c: cv2.boundingRect(c)[1])
    haut_couleur = cv2.boundingRect(couleur)[1]
    rang = [c for c in utiles if c is not couleur and cv2.boundingRect(c)[1] + cv2.boundingRect(c)[3] // 2 < haut_couleur]
    if not rang:
        return None

    def decouper(formes, taille):
        x0, y0, x1, y1 = _boite_englobante(formes)
        return cv2.resize(masque[y0:y1, x0:x1], taille, interpolation=cv2.INTER_AREA)

    x0, y0, x1, y1 = _boite_englobante([couleur])
    pixels = coin[y0:y1, x0:x1][masque[y0:y1, x0:x1] > 0].astype(np.int32)
    est_rouge = bool(len(pixels)) and float(np.mean(pixels[:, 2] - (pixels[:, 0] + pixels[:, 1]) / 2)) > 40
    return decouper(rang, TAILLE_RANG), decouper([couleur], TAILLE_COULEUR), est_rouge


def masque_clair(image):
    """Séparation clair / foncé : idéale sur un tapis uni."""
    gris = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, masque = cv2.threshold(cv2.GaussianBlur(gris, (5, 5), 0), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return masque


def masque_blanc(image):
    """Zones blanches (claires ET peu colorées) : le fond des cartes, pas un tapis gris ou du bois éclairé."""
    hsv = cv2.cvtColor(cv2.GaussianBlur(image, (5, 5), 0), cv2.COLOR_BGR2HSV)
    saturation, luminosite = hsv[:, :, 1], hsv[:, :, 2]
    # Seuil relatif aux zones les plus claires de l'image, pour suivre l'éclairage de la pièce
    seuil = max(130, int(np.percentile(luminosite, 99.5)) - 70)
    masque = ((luminosite >= seuil) & (saturation <= 70)).astype(np.uint8) * 255
    noyau = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    masque = cv2.morphologyEx(masque, cv2.MORPH_OPEN, noyau)
    return cv2.morphologyEx(masque, cv2.MORPH_CLOSE, noyau)


def _ecart(a, b):
    return float(np.mean(cv2.absdiff(a, b))) / 255


class Detecteur:
    def __init__(self, dossier_modeles):
        dossier = Path(dossier_modeles)
        self.rangs = self._charger(dossier / "rangs", RANGS)
        self.couleurs = self._charger(dossier / "couleurs", COULEURS)
        if not self.rangs or not self.couleurs:
            raise FileNotFoundError(
                f"Aucun modèle dans {dossier}. Lancez « python generer_modeles.py » (démo) ou « python calibrer.py »."
            )
        # Cartes repérées sur la dernière image, même illisibles (pour savoir si la table est vide)
        self.nb_cartes_vues = 0

    @staticmethod
    def _charger(dossier, noms_valides):
        """Fichiers <nom>.png ou <nom>_<n>.png (plusieurs exemples par nom)."""
        modeles = []
        for fichier in sorted(dossier.glob("*.png")):
            nom = fichier.stem.split("_")[0]
            if nom in noms_valides:
                modeles.append((nom, cv2.imread(str(fichier), cv2.IMREAD_GRAYSCALE)))
        return modeles

    def _meilleur(self, masque, modeles, autorises=None):
        candidats = [(nom, _ecart(masque, modele)) for nom, modele in modeles if autorises is None or nom in autorises]
        return min(candidats, key=lambda c: c[1], default=(None, 1.0))

    def reconnaitre(self, carte_redressee):
        """(rang, couleur, ecart) d'une carte redressée, ou None si illisible."""
        index = extraire_index(carte_redressee)
        if index is None:
            return None
        masque_rang, masque_couleur, est_rouge = index
        rang, ecart_rang = self._meilleur(masque_rang, self.rangs)
        # La teinte départage d'abord rouge / noir, la forme fait le reste
        famille = ROUGES if est_rouge else set(COULEURS) - ROUGES
        couleur, ecart_couleur = self._meilleur(masque_couleur, self.couleurs, famille)
        if rang is None or couleur is None or ecart_rang > ECART_MAX_RANG or ecart_couleur > ECART_MAX_COULEUR:
            return None
        return rang, couleur, max(ecart_rang, ecart_couleur)

    def trouver_cartes(self, image):
        """Contours à 4 coins ayant la taille et les proportions d'une carte.

        Deux masques complémentaires (tapis uni / décor chargé) : une carte trouvée par les deux ne compte qu'une fois.
        """
        contours = []
        for masque in (masque_clair(image), masque_blanc(image)):
            contours += cv2.findContours(masque, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
        aire_image = image.shape[0] * image.shape[1]
        cartes = []
        centres = []
        for contour in contours:
            aire = cv2.contourArea(contour)
            if not 0.0015 * aire_image < aire < 0.12 * aire_image:
                continue
            approx = cv2.approxPolyDP(contour, 0.03 * cv2.arcLength(contour, True), True)
            if len(approx) != 4 or not cv2.isContourConvex(approx):
                continue
            (_, _), (a, b), _ = cv2.minAreaRect(contour)
            if not 1.2 < max(a, b) / max(min(a, b), 1) < 1.8:
                continue
            centre = approx.reshape(4, 2).mean(axis=0)
            if any(np.linalg.norm(centre - autre) < min(a, b) / 2 for autre in centres):
                continue
            centres.append(centre)
            cartes.append(approx)
        return cartes

    def detecter(self, image):
        detections = []
        contours = self.trouver_cartes(image)
        self.nb_cartes_vues = len(contours)
        for contour in contours:
            carte = redresser(image, ordonner_coins(contour))
            resultat = self.reconnaitre(carte)
            if resultat is None:
                continue
            rang, couleur, ecart = resultat
            m = cv2.moments(contour)
            centre = (int(m["m10"] / m["m00"]), int(m["m01"] / m["m00"]))
            detections.append(Detection(rang, couleur, centre, contour, ecart))
        return detections
