"""
Service de detection pour Docker : recoit les images de la camera du dealer
par Socket.IO (room `detection` du backend), les analyse avec detection.py
et renvoie les mains au backend avec l'evenement `cartes`.

Pas de webcam ni de fenetre ici : la camera est lue par le navigateur du
dealer, le backend relaie ses images.

Variables d'environnement :
  BACKEND_URL    URL du backend Socket.IO (defaut: http://localhost:3000)
  CLE_DETECTION  cle partagee avec le backend (obligatoire)

Envoie : cartes {salonId, mains: {croupier, joueurs}}
  croupier : main de la zone du haut (ou None)
  joueurs  : mains de la zone du bas, de la vraie gauche du dealer
             (droite de l'image) vers sa droite
"""

import json
import os
import threading
import time

import cv2
import numpy as np
import socketio

from detection import (SuiviCartes, charger_config_coin, charger_templates,
                       decrire_main, traiter_image)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3000")
CLE_DETECTION = os.environ.get("CLE_DETECTION")

ZONE_CROUPIER = 0.40     # une main dont le centre est dans les 40% du haut de l'image = croupier
OUBLI_SALON_S = 60       # secondes sans image avant d'oublier le suivi d'un salon


def separer_zones(groupes, hauteur):
    """Entrees : pistes de chaque main (traiter_image) et hauteur de l'image;
    sortie : {croupier, joueurs}. Toutes les cartes du haut forment une seule
    main (le croupier peut ecarter sa carte cachee)."""
    limite = ZONE_CROUPIER * hauteur
    croupier, joueurs = [], []
    for g in groupes:
        centre_y = np.mean([p["coins"][:, 1].mean() for p in g])
        if centre_y < limite:
            croupier.extend(g)
        else:
            joueurs.append(g)

    croupier.sort(key=lambda p: p["ordre"])
    joueurs.sort(key=lambda g: -max(p["coins"][:, 0].max() for p in g))  # droite de l'image d'abord
    return {
        "croupier": decrire_main(0, croupier) if croupier else None,
        "joueurs": [decrire_main(i + 1, g) for i, g in enumerate(joueurs)],
    }


class Service:
    """Garde seulement la derniere image de chaque salon : si l'analyse est
    plus lente que la camera, les images en trop sont sautees au lieu de
    s'accumuler."""

    def __init__(self):
        charger_config_coin()
        self.templates = charger_templates()
        self.sio = socketio.Client()
        self.dernieres = {}      # salonId -> JPEG (bytes) pas encore analyse
        self.suivis = {}         # salonId -> SuiviCartes (historique des cartes)
        self.envoyes = {}        # salonId -> dernier resultat envoye (JSON), pour ne pas renvoyer le meme
        self.vus = {}            # salonId -> heure de la derniere image
        self.verrou = threading.Lock()
        self.nouvelle = threading.Event()
        self.stats, self.dernier_bilan = {}, time.time()  # DEBUG temporaire

        self.sio.on("connect", lambda: print(f"Connecte a {BACKEND_URL}"))
        self.sio.on("disconnect", lambda *_: print("Deconnecte du backend"))
        self.sio.on("frame", self.recevoir)

    def recevoir(self, donnees):
        salon_id, image = donnees.get("salonId"), donnees.get("image")
        if not salon_id or not isinstance(image, bytes):
            return
        with self.verrou:
            self.dernieres[salon_id] = image
        self.nouvelle.set()

    def analyser(self, salon_id, jpeg):
        frame = cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return
        suivi = self.suivis.setdefault(salon_id, SuiviCartes())
        _, groupes, _ = traiter_image(frame, suivi, self.templates)
        mains = separer_zones(groupes, frame.shape[0])

        # DEBUG temporaire
        cv2.imwrite(f"/tmp/derniere_{salon_id}.jpg", frame)
        stats = self.stats.setdefault(salon_id, {"images": 0, "cartes": 0, "taille": None})
        stats["images"] += 1
        stats["cartes"] = sum(len(g) for g in groupes)
        stats["taille"] = frame.shape[:2]

        texte = json.dumps(mains, sort_keys=True)
        if texte != self.envoyes.get(salon_id) and self.sio.connected:
            self.sio.emit("cartes", {"salonId": salon_id, "mains": mains})
            self.envoyes[salon_id] = texte

    def oublier_inactifs(self):
        limite = time.time() - OUBLI_SALON_S
        for salon_id in [s for s, t in self.vus.items() if t < limite]:
            for d in (self.suivis, self.envoyes, self.vus):
                d.pop(salon_id, None)

    def boucle_analyse(self):
        while True:
            self.nouvelle.wait(timeout=5)
            self.nouvelle.clear()
            with self.verrou:
                a_traiter, self.dernieres = self.dernieres, {}
            for salon_id, jpeg in a_traiter.items():
                self.vus[salon_id] = time.time()
                try:
                    self.analyser(salon_id, jpeg)
                except Exception as err:  # une image bizarre ne doit pas arreter le service
                    print(f"Erreur d'analyse (salon {salon_id}) : {err}")
            self.oublier_inactifs()
            if time.time() - self.dernier_bilan > 5:  # DEBUG temporaire
                print(f"Bilan 5 s : {self.stats or 'aucune image recue'}")
                self.stats, self.dernier_bilan = {}, time.time()

    def demarrer(self):
        threading.Thread(target=self.boucle_analyse, daemon=True).start()
        # retry : le backend peut ne pas etre pret quand le conteneur demarre
        self.sio.connect(BACKEND_URL, auth={"cle": CLE_DETECTION}, retry=True)
        self.sio.wait()


if __name__ == "__main__":
    if not CLE_DETECTION:
        raise SystemExit("CLE_DETECTION manquante : le backend refuserait la connexion.")
    Service().demarrer()
