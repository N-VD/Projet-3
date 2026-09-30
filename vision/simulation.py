"""Mode démo : une table filmée virtuelle où un croupier automatique pose de vraies images de cartes.

Le croupier simulé obéit aux instructions du backend (zone qui attend une carte, ramassage),
et l'image produite passe par le même détecteur que la caméra : toute la chaîne est testée.
"""

import random
import time

import cv2
import numpy as np

from cartes import COULEURS, RANGS, dessiner_carte

LARGEUR_IMAGE, HAUTEUR_IMAGE = 1600, 900
LIGNE_CROUPIER = 0.42
CARTE_L, CARTE_H = 88, 132
PAR_RANGEE = 3
NB_PAQUETS = 6

DELAI_ENTRE_CARTES = 1.0
DELAI_RAMASSAGE = 1.5
ATTENTE_CONFIRMATION_MAX = 4.0


class TableSimulee:
    def __init__(self, nb_places):
        self.nb_places = nb_places
        self.cartes = []  # (zone, image, masque, x, y)
        self.sabot = []
        self.derniere_action = 0.0
        self.debut_nettoyage = None
        self.tapis = self._dessiner_tapis()

    def _dessiner_tapis(self):
        img = np.zeros((HAUTEUR_IMAGE, LARGEUR_IMAGE, 3), np.uint8)
        img[:] = (45, 105, 30)
        bord = (70, 160, 200)
        y = int(HAUTEUR_IMAGE * LIGNE_CROUPIER)
        cv2.putText(img, "CROUPIER", (LARGEUR_IMAGE // 2 - 70, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, bord, 2, cv2.LINE_AA)
        largeur_place = LARGEUR_IMAGE // self.nb_places
        for i in range(self.nb_places):
            cx = i * largeur_place + largeur_place // 2
            cv2.putText(img, f"PLACE {i + 1}", (cx - 55, HAUTEUR_IMAGE - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.8, bord, 2, cv2.LINE_AA)
            cv2.ellipse(img, (cx, y + 40), (largeur_place // 2 - 20, 30), 0, 0, 180, bord, 1, cv2.LINE_AA)
        return img

    def _tirer(self):
        if len(self.sabot) < 60:
            self.sabot = [(r, c) for _ in range(NB_PAQUETS) for r in RANGS for c in COULEURS]
            random.shuffle(self.sabot)
        return self.sabot.pop()

    def _position(self, zone):
        n = sum(1 for carte in self.cartes if carte[0] == zone)
        if zone == "croupier":
            return LARGEUR_IMAGE // 2 - 180 + n * 105, 110
        largeur_place = LARGEUR_IMAGE // self.nb_places
        x = zone * largeur_place + (largeur_place - PAR_RANGEE * 100) // 2 + (n % PAR_RANGEE) * 100
        y = int(HAUTEUR_IMAGE * LIGNE_CROUPIER) + 50 + (n // PAR_RANGEE) * 140
        return x, y

    def _poser(self, zone):
        rang, couleur = self._tirer()
        carte = cv2.resize(dessiner_carte(rang, couleur), (CARTE_L, CARTE_H), interpolation=cv2.INTER_AREA)
        # Légère rotation, comme une carte posée à la main
        cote = int(np.hypot(CARTE_L, CARTE_H)) + 4
        image = np.zeros((cote, cote, 3), np.uint8)
        masque = np.zeros((cote, cote), np.uint8)
        x0, y0 = (cote - CARTE_L) // 2, (cote - CARTE_H) // 2
        image[y0:y0 + CARTE_H, x0:x0 + CARTE_L] = carte
        masque[y0:y0 + CARTE_H, x0:x0 + CARTE_L] = 255
        rotation = cv2.getRotationMatrix2D((cote / 2, cote / 2), random.uniform(-6, 6), 1)
        image = cv2.warpAffine(image, rotation, (cote, cote))
        masque = cv2.warpAffine(masque, rotation, (cote, cote))
        x, y = self._position(zone)
        self.cartes.append((zone, image, masque > 128, x - (cote - CARTE_L) // 2, y - (cote - CARTE_H) // 2))

    def _cartes_confirmees(self, etat):
        """Vrai si le backend a enregistré toutes les cartes posées (évite de distribuer deux fois)."""
        attendu = {"croupier": len(etat["croupier"]["cartes"])}
        for place in etat["places"]:
            if place:
                attendu[place["index"]] = sum(len(main["cartes"]) for main in place["mains"])
        for zone in {carte[0] for carte in self.cartes} | set(attendu):
            if sum(1 for carte in self.cartes if carte[0] == zone) != attendu.get(zone, 0):
                return False
        return True

    def mettre_a_jour(self, etat):
        """Le croupier automatique agit selon l'état de la table renvoyé par le backend."""
        if etat is None:
            return
        maintenant = time.monotonic()
        if etat["phase"] == "nettoyage":
            self.debut_nettoyage = self.debut_nettoyage or maintenant
            if maintenant - self.debut_nettoyage > DELAI_RAMASSAGE:
                self.cartes.clear()
            return
        self.debut_nettoyage = None
        if etat["phase"] == "mises":
            # Table rangée avant la prochaine donne (ex. après un redémarrage du backend)
            self.cartes.clear()
            return

        zone = etat.get("zoneAttendue")
        if zone is None or maintenant - self.derniere_action < DELAI_ENTRE_CARTES:
            return
        confirme = self._cartes_confirmees(etat)
        if not confirme and maintenant - self.derniere_action < ATTENTE_CONFIRMATION_MAX:
            return
        self._poser(zone)
        self.derniere_action = maintenant

    def lire(self):
        img = self.tapis.copy()
        for _, image, masque, x, y in self.cartes:
            # Découpe ce qui dépasse du bord de l'image
            h, l = masque.shape
            gx, gy = max(-x, 0), max(-y, 0)
            dx, dy = min(l, LARGEUR_IMAGE - x), min(h, HAUTEUR_IMAGE - y)
            zone = img[y + gy:y + dy, x + gx:x + dx]
            m = masque[gy:dy, gx:dx]
            zone[m] = image[gy:dy, gx:dx][m]
        # Bruit de capteur
        bruit = np.random.randint(0, 10, img.shape, dtype=np.uint8)
        return cv2.add(img, bruit)
