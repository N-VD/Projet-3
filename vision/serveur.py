"""Service de vision du blackjack live.

Capture la table (caméra, écran ou démo), reconnaît les cartes, envoie au backend les cartes stables
de chaque zone (croupier + places) et diffuse la vidéo annotée en MJPEG pour la page web.

    python serveur.py --source demo
    python serveur.py --source camera --camera 0 --modeles modeles/perso
    python serveur.py --source ecran --ecran 0,0,1600,900 --modeles modeles/perso
"""

import argparse
import json
import os
import threading
import time
import unicodedata
import urllib.error
import urllib.request
from collections import Counter, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import cv2
import numpy as np

from cartes import nom_carte
from detecteur import Detecteur
from simulation import TableSimulee

DOSSIER = Path(__file__).parent
IMAGES_STABLES = 5  # une carte doit être lue sur autant d'images consécutives avant d'être envoyée
INTERVALLE_ENVOI = 0.3
IPS_MAX = 20

JAUNE, VERT, ROUGE, BLANC = (0, 215, 255), (60, 220, 60), (60, 60, 230), (255, 255, 255)


# --- Sources d'images ---

class SourceCamera:
    def __init__(self, index):
        self.capture = cv2.VideoCapture(index, cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY)
        self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
        if not self.capture.isOpened():
            raise RuntimeError(f"Impossible d'ouvrir la caméra {index}")

    def lire(self):
        ok, image = self.capture.read()
        return image if ok else None

    def mettre_a_jour(self, etat):
        pass


class SourceEcran:
    """Capture une région de l'écran (ex. un flux vidéo affiché dans une fenêtre)."""

    def __init__(self, region):
        import mss

        self.mss = mss.mss()
        x, y, l, h = (int(v) for v in region.split(","))
        self.region = {"left": x, "top": y, "width": l, "height": h}

    def lire(self):
        return cv2.cvtColor(np.array(self.mss.grab(self.region)), cv2.COLOR_BGRA2BGR)

    def mettre_a_jour(self, etat):
        pass


# --- Zones de la table et stabilité ---

def repartir(detections, forme, nb_places, ligne_croupier):
    """Range chaque carte dans la zone du croupier (en haut) ou d'une place (bandes verticales en bas)."""
    hauteur, largeur = forme[:2]
    zones = {"croupier": [], "places": [[] for _ in range(nb_places)]}
    for d in detections:
        x, y = d.centre
        if y < hauteur * ligne_croupier:
            zones["croupier"].append(d)
        else:
            zones["places"][min(int(x / largeur * nb_places), nb_places - 1)].append(d)
    return zones


class Stabilisateur:
    """Ne garde que les cartes vues sur toutes les dernières images : une lecture isolée erronée est ignorée."""

    def __init__(self, taille):
        self.historique = deque(maxlen=taille)
        self.vues = deque(maxlen=taille)

    def ajouter(self, zones, nb_cartes_vues):
        compte = {"croupier": Counter((d.rang, d.couleur) for d in zones["croupier"])}
        for i, cartes in enumerate(zones["places"]):
            compte[i] = Counter((d.rang, d.couleur) for d in cartes)
        self.historique.append(compte)
        self.vues.append(nb_cartes_vues)

    def zones_stables(self, nb_places):
        def stable(zone):
            if len(self.historique) < self.historique.maxlen:
                return []
            commun = self.historique[0].get(zone, Counter())
            for compte in list(self.historique)[1:]:
                commun = commun & compte.get(zone, Counter())
            return [{"rang": r, "couleur": c} for (r, c), n in sorted(commun.items()) for _ in range(n)]

        return {"croupier": stable("croupier"), "places": [stable(i) for i in range(nb_places)]}

    def table_vide(self):
        return len(self.vues) == self.vues.maxlen and not any(self.vues)


# --- Échanges avec le backend ---

class LienBackend(threading.Thread):
    """Envoie en continu les cartes stables et récupère l'état de la table."""

    def __init__(self, url, cle):
        super().__init__(daemon=True)
        self.url = url.rstrip("/") + "/live/vision"
        self.cle = cle
        self.a_envoyer = None
        self.etat = None
        self.erreur = "Connexion au backend…"
        self.verrou = threading.Lock()

    def publier(self, donnees):
        with self.verrou:
            self.a_envoyer = donnees

    def run(self):
        while True:
            with self.verrou:
                donnees = self.a_envoyer
            if donnees is not None:
                requete = urllib.request.Request(
                    self.url,
                    data=json.dumps(donnees).encode(),
                    headers={"Content-Type": "application/json", "x-cle-vision": self.cle},
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(requete, timeout=2) as reponse:
                        self.etat = json.loads(reponse.read())["table"]
                        self.erreur = None
                except urllib.error.HTTPError as err:
                    self.erreur = f"Backend : erreur {err.code}"
                except (urllib.error.URLError, OSError):
                    self.erreur = "Backend injoignable"
            time.sleep(INTERVALLE_ENVOI)


# --- Diffusion MJPEG ---

class Diffuseur:
    def __init__(self):
        self.jpeg = None
        self.condition = threading.Condition()

    def publier(self, image):
        ok, tampon = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 75])
        if ok:
            with self.condition:
                self.jpeg = tampon.tobytes()
                self.condition.notify_all()

    def attendre(self):
        with self.condition:
            self.condition.wait(timeout=2)
            return self.jpeg


def creer_serveur_http(diffuseur, port):
    class Gestionnaire(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith("/video"):
                self.send_response(200)
                self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=image")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                try:
                    while True:
                        jpeg = diffuseur.attendre()
                        if jpeg is None:
                            continue
                        self.wfile.write(b"--image\r\nContent-Type: image/jpeg\r\n")
                        self.wfile.write(f"Content-Length: {len(jpeg)}\r\n\r\n".encode())
                        self.wfile.write(jpeg + b"\r\n")
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                    return
            elif self.path == "/":
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write('<body style="margin:0;background:#000"><img src="/video" style="width:100%">'.encode())
            else:
                self.send_error(404)

        def log_message(self, *args):
            pass

    serveur = ThreadingHTTPServer(("0.0.0.0", port), Gestionnaire)
    serveur.daemon_threads = True
    threading.Thread(target=serveur.serve_forever, daemon=True).start()


# --- Incrustations pour le croupier ---

def ascii(texte):
    """Les polices OpenCV n'ont pas d'accents."""
    return unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode()


def rectangle_zone(zone, forme, nb_places, ligne_croupier):
    hauteur, largeur = forme[:2]
    y = int(hauteur * ligne_croupier)
    if zone == "croupier":
        return (0, 0), (largeur - 1, y)
    l = largeur // nb_places
    return (zone * l, y), ((zone + 1) * l - 1, hauteur - 1)


def dessiner(image, zones, etat, erreur, nb_places, ligne_croupier):
    hauteur, largeur = image.shape[:2]
    y = int(hauteur * ligne_croupier)
    cv2.line(image, (0, y), (largeur, y), BLANC, 1)
    for i in range(1, nb_places):
        x = largeur * i // nb_places
        cv2.line(image, (x, y), (x, hauteur), BLANC, 1)

    if etat and etat.get("zoneAttendue") is not None:
        a, b = rectangle_zone(etat["zoneAttendue"], image.shape, nb_places, ligne_croupier)
        cv2.rectangle(image, a, b, JAUNE, 4)

    for d in zones["croupier"] + [d for place in zones["places"] for d in place]:
        cv2.drawContours(image, [d.contour], -1, VERT, 3)
        x, yc = d.centre
        texte = nom_carte(d.rang, d.couleur)
        cv2.rectangle(image, (x - 34, yc - 22), (x + 34, yc + 10), (0, 0, 0), -1)
        cv2.putText(image, texte, (x - 28, yc + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.8, VERT, 2, cv2.LINE_AA)

    # Bandeau : instruction au croupier ou erreur de liaison
    if erreur:
        message, teinte = erreur, ROUGE
    elif etat:
        restant = f"  ({etat['restantMs'] // 1000}s)" if etat.get("restantMs") is not None else ""
        message, teinte = f"Manche {etat['manche']} - {etat['instructionCroupier']}{restant}", JAUNE
    else:
        message, teinte = "En attente du backend", BLANC
    cv2.rectangle(image, (0, hauteur - 44), (largeur, hauteur), (0, 0, 0), -1)
    cv2.putText(image, ascii(message), (16, hauteur - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.9, teinte, 2, cv2.LINE_AA)
    cv2.circle(image, (largeur - 70, 30), 9, (40, 40, 240), -1)
    cv2.putText(image, "LIVE", (largeur - 55, 39), cv2.FONT_HERSHEY_SIMPLEX, 0.8, BLANC, 2, cv2.LINE_AA)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", choices=["demo", "camera", "ecran"], default=os.getenv("VISION_SOURCE", "demo"))
    parser.add_argument("--camera", type=int, default=0, help="index de la caméra")
    parser.add_argument("--ecran", default="0,0,1600,900", help="région de l'écran : x,y,largeur,hauteur")
    parser.add_argument("--modeles", help="dossier des modèles (défaut : modeles/demo en démo, sinon modeles/perso)")
    parser.add_argument("--backend", default=os.getenv("BACKEND_URL", "http://localhost:3000"))
    parser.add_argument("--cle", default=os.getenv("LIVE_CLE_VISION", "cle-vision-dev"), help="clé partagée avec le backend")
    parser.add_argument("--port", type=int, default=int(os.getenv("VISION_PORT", "8000")))
    parser.add_argument("--ligne-croupier", type=float, default=0.42, help="limite zone croupier / places (fraction de la hauteur)")
    parser.add_argument("--fenetre", action="store_true", help="affiche aussi une fenêtre locale (touche q pour quitter)")
    args = parser.parse_args()

    nb_places = 5  # mis à jour avec la valeur du backend
    modeles = args.modeles or DOSSIER / "modeles" / ("demo" if args.source == "demo" else "perso")
    detecteur = Detecteur(modeles)
    if args.source == "demo":
        source = TableSimulee(nb_places)
    elif args.source == "camera":
        source = SourceCamera(args.camera)
    else:
        source = SourceEcran(args.ecran)

    lien = LienBackend(args.backend, args.cle)
    lien.start()
    diffuseur = Diffuseur()
    creer_serveur_http(diffuseur, args.port)
    stabilisateur = Stabilisateur(IMAGES_STABLES)
    print(f"Vision prête : source={args.source}, modèles={modeles}")
    print(f"Vidéo : http://localhost:{args.port}/video  ·  backend : {args.backend}")

    while True:
        debut = time.monotonic()
        etat = lien.etat
        if etat and etat["nbPlaces"] != nb_places:
            nb_places = etat["nbPlaces"]
            if args.source == "demo":
                source = TableSimulee(nb_places)
        source.mettre_a_jour(etat)

        image = source.lire()
        if image is None:
            time.sleep(0.1)
            continue

        detections = detecteur.detecter(image)
        zones = repartir(detections, image.shape, nb_places, args.ligne_croupier)
        stabilisateur.ajouter(zones, detecteur.nb_cartes_vues)
        lien.publier({"zones": stabilisateur.zones_stables(nb_places), "vide": stabilisateur.table_vide()})

        dessiner(image, zones, etat, lien.erreur, nb_places, args.ligne_croupier)
        diffuseur.publier(image)
        if args.fenetre:
            cv2.imshow("Blackjack live - vision", image)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        time.sleep(max(0, 1 / IPS_MAX - (time.monotonic() - debut)))


if __name__ == "__main__":
    main()
