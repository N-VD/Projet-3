"""
Agent camera : a lancer une fois sur chaque machine qui a des webcams.

Le backend roule dans Docker et ne peut pas ouvrir les webcams. Cet agent ouvre une connexion
au backend (namespace /agentCamera) par webcam, un « poste ». Quand un salon est attribue a un
poste ("demarrer"), l'agent lance detection.py sur cette webcam; quand le salon est supprime
("arreter"), il le ferme. Plusieurs webcams = plusieurs salons filmes en meme temps.

Utilisation (depuis la racine du projet) :
    npm run camera                       # webcam 0
    npm run camera -- --cameras 0 1      # deux webcams, deux salons a la fois
ou :
    python agent_camera.py --serveur http://localhost:3000 --cameras 0 1

La cle est lue dans CLE_CAMERA (variable d'environnement ou .env a la racine du projet).
"""

import argparse
import os
import socket
import subprocess
import sys
import threading
import time

import socketio

DOSSIER = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(DOSSIER, "detection.py")
FICHIER_ENV = os.path.join(DOSSIER, "..", ".env")


def lire_cle():
    """Sortie : CLE_CAMERA de l'environnement, sinon celle du .env a la racine du projet (ou None)."""
    if os.environ.get("CLE_CAMERA"):
        return os.environ["CLE_CAMERA"]
    try:
        with open(FICHIER_ENV, encoding="utf-8") as f:
            for ligne in f:
                cle, _, valeur = ligne.strip().partition("=")
                if cle == "CLE_CAMERA" and valeur:
                    return valeur
    except OSError:
        pass
    return None


class Poste:
    """Une webcam : sa connexion au backend et le detection.py qui la filme (un seul a la fois)."""

    def __init__(self, serveur, cle, camera, options_detection):
        self.serveur = serveur
        self.cle = cle
        self.camera = camera
        self.nom = f"{socket.gethostname()}:{camera}"
        self.options_detection = options_detection
        self.processus = None
        self.salon_id = None
        self.verrou = threading.Lock()
        self.termine = threading.Event()

        self.sio = socketio.Client(reconnection=True)
        self.sio.on("connect", self._connecte, namespace="/agentCamera")
        self.sio.on("disconnect", self._deconnecte, namespace="/agentCamera")
        self.sio.on("demarrer", self.demarrer, namespace="/agentCamera")
        self.sio.on("arreter", self.arreter, namespace="/agentCamera")

    def log(self, message):
        print(f"[camera {self.camera}] {message}", flush=True)

    def _connecte(self):
        self.log("Connecte au backend, en attente d'un salon...")

    def _deconnecte(self, raison=None):
        if raison == self.sio.reason.SERVER_DISCONNECT:
            # Le backend nous a remplaces par la meme webcam lancee ailleurs : on libere la webcam
            self.log("Cette webcam a ete reprise par un autre agent : arret de ce poste.")
            self.fermer()
            self.termine.set()
            return
        self.log("Deconnecte du backend, reconnexion...")

    def _surveiller(self, processus, salon_id):
        code = processus.wait()
        if self.processus is processus:  # pas ferme volontairement par l'agent
            self.log(f"detection.py s'est arrete (code {code}) pour le salon {salon_id}")

    def demarrer(self, message):
        salon_id = str(message.get("salonId", ""))
        with self.verrou:
            if self.salon_id == salon_id and self.processus and self.processus.poll() is None:
                return  # deja en train de filmer ce salon (ex. reconnexion au backend)
            self._fermer()
            self.log(f"Salon {salon_id} : ouverture de la camera")
            env = {**os.environ, "CLE_CAMERA": self.cle}
            self.processus = subprocess.Popen(
                [sys.executable, SCRIPT, "--serveur", self.serveur, "--salon", salon_id,
                 "--camera", str(self.camera), *self.options_detection],
                cwd=DOSSIER, env=env)
            self.salon_id = salon_id
            threading.Thread(target=self._surveiller, args=(self.processus, salon_id), daemon=True).start()

    def arreter(self, message):
        with self.verrou:
            if self.salon_id == str(message.get("salonId", "")):
                self.log(f"Salon {self.salon_id} supprime : fermeture de la camera")
                self._fermer()

    def fermer(self):
        with self.verrou:
            self._fermer()

    def _fermer(self):
        processus, self.processus, self.salon_id = self.processus, None, None
        if processus and processus.poll() is None:
            if os.name == "nt":
                # Le python.exe du venv est un lanceur : /T ferme aussi le vrai Python qui tient la webcam
                subprocess.run(["taskkill", "/pid", str(processus.pid), "/T", "/F"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                processus.terminate()
            processus.wait()

    def executer(self):
        # Le backend peut ne pas etre encore demarre (docker compose up en cours) : on reessaie
        while not self.termine.is_set():
            try:
                self.sio.connect(self.serveur, namespaces=["/agentCamera"],
                                 auth={"cle": self.cle, "poste": self.nom}, transports=["websocket"])
                break
            except socketio.exceptions.ConnectionError as e:
                self.log(f"Backend injoignable ({e}), nouvel essai dans 3 s...")
                time.sleep(3)
        self.termine.wait()
        self.sio.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serveur", type=str, default="http://localhost:3000",
                        help="URL du backend (defaut: http://localhost:3000)")
    parser.add_argument("--cameras", type=int, nargs="+", default=[0],
                        help="Index des webcams a utiliser, une par salon (defaut: 0)")
    parser.add_argument("--fps", type=int, default=None, help="Transmis a detection.py")
    parser.add_argument("--annote", action="store_true", help="Transmis a detection.py")
    args = parser.parse_args()

    cle = lire_cle()
    if not cle:
        parser.error("CLE_CAMERA introuvable (variable d'environnement ou .env a la racine du projet)")

    options = (["--fps", str(args.fps)] if args.fps else []) + (["--annote"] if args.annote else [])
    postes = [Poste(args.serveur, cle, camera, options) for camera in dict.fromkeys(args.cameras)]
    for poste in postes:
        threading.Thread(target=poste.executer, daemon=True).start()

    try:
        while not all(poste.termine.is_set() for poste in postes):
            time.sleep(0.5)  # boucle courte : Ctrl+C reste possible sous Windows
    except KeyboardInterrupt:
        print("Agent arrete.")
    finally:
        for poste in postes:
            poste.fermer()
