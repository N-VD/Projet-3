"""
Detection de cartes + valeur - v6

Corrections v6 (verrou instable, doublons, recherche permanente) :
  - Une "carte" doit avoir un CONTOUR BLANC (peu sature, clair). La main,
    la manche, un telephone... ne sont plus pris pour des cartes, et ne
    se collent plus a la silhouette des vraies cartes (ce qui faisait
    bouger leur taille/position et cassait le suivi).
  - Suppression des doublons : deux detections qui se recouvrent a plus de
    75% = une seule carte (deux cartes en escalier se recouvrent ~50%).
  - Suivi par RECOUVREMENT des rectangles (plus robuste que la distance
    entre centres) + fusion des pistes en double : on garde celle qui est
    verrouillee, sinon la plus ancienne.
  - Une nouvelle carte n'est affichee / comptee qu'apres FRAMES_MIN_APPARITION
    frames : les detections fantomes d'une frame ne creent plus de "?".
  - Les pistes jamais confirmees disparaissent vite ; les verrouillees
    tiennent FRAMES_ABSENCE_MAX frames.

Reglages a ajuster selon votre table/eclairage : SAT_MAX_BLANC, VAL_MIN_BLANC
(touche 'm' en detection = afficher le masque "blanc" pour verifier).

--- Notes de la v5 ---

Nouveau dans la v5 :
  - Les cartes qui se touchent / se chevauchent sont regroupees en MAINS
    (une main en escalier = une main de blackjack).
  - Valeur de chaque main calculee selon les regles du blackjack
    (as = 1 ou 11, figures = 10), avec soft / blackjack / bust.
  - Envoi des mains en JSON (POST) vers l'API d'un serveur web, dans un
    thread a part pour ne jamais bloquer la camera. Envoi seulement quand
    une main change.

    python detection_v6.py --api http://localhost:5000/api/mains

  Pour tester sans vrai serveur : python serveur_test.py (affiche ce qu'il recoit)

--- Notes de la v4 ---

Nouveautes par rapport a la v3 :
  1. VERROUILLAGE : des qu'une carte est reconnue (vote confirme), son rang
     est fige. Il ne change plus tant que la carte reste sur la table. Il
     se deverrouille seulement quand la carte disparait (retiree) pendant
     plus de FRAMES_ABSENCE_MAX frames. Touche 'r' = tout deverrouiller.
  2. PLUS DE CLIGNOTEMENT : une carte verrouillee reste affichee meme si
     sa detection rate quelques frames (main au-dessus, reflet, etc.).
  3. CARTES SUPERPOSEES (style blackjack) : au lieu de chercher un
     rectangle complet par carte, on prend la silhouette du paquet de
     cartes qui se chevauchent, on trouve l'orientation et la taille d'une
     carte, puis on reconstruit chaque carte a partir de ses coins visibles.
     Le rang est lu dans le coin haut-gauche OU bas-droit, selon celui qui
     n'est pas cache par une autre carte.

Les templates de la v3 (dossier templates_rangs_2) restent compatibles.

Contrainte pour les cartes superposees : le decalage entre deux cartes
doit laisser l'index (rang + symbole) de la carte du dessous visible,
comme au blackjack.

MODE CALIBRATION
    python detection_v4.py --calibrer 6
MODE DETECTION
    python detection_v4.py
"""

import argparse
import json
import os
import queue
import threading
import time
import urllib.error
import urllib.request
from collections import deque, Counter

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Parametres
# ---------------------------------------------------------------------------
RATIO_CARTE = 63 / 88          # largeur / hauteur d'une carte

AIRE_MIN = 3000                # aire min d'une carte (px)
AIRE_MAX_GROUPE = 800000       # aire max d'un paquet de cartes superposees

LARGEUR_CARTE = 300
HAUTEUR_CARTE = 420

COIN_LARGEUR = 70
COIN_HAUTEUR = 130

DOSSIER_TEMPLATES = "templates_rangs_2"
FICHIER_CONFIG_COIN = "config_coin.json"
SEUIL_CONFIANCE = 0.45

TAILLE_FINALE_LARGEUR = 60
TAILLE_FINALE_HAUTEUR = 90

MARGE_BORD = 4
FRACTION_AIRE_MIN = 0.004
FRACTION_HAUTEUR_MIN = 0.10
DECALAGE_MATCH = 4
TOP_K = 3

# Reconstruction des cartes dans un paquet
EPSILON_POLY = 0.008           # precision de la simplification de la silhouette
REMPLISSAGE_MIN = 0.88         # une carte hypothetique doit etre a 88% dans la silhouette
IOU_MIN = 0.70                 # les cartes reconstruites doivent couvrir la silhouette
PENALITE_PAR_CARTE = 0.03      # a couverture egale, on prefere l'explication avec le moins de cartes

# Validation "c'est bien une carte" : son contour doit etre blanc
SAT_MAX_BLANC = 70             # saturation max d'un pixel "blanc carte" (0-255)
VAL_MIN_BLANC = 120            # luminosite min d'un pixel "blanc carte" (0-255)
FRACTION_BLANC_MIN = 0.60      # % du contour interieur de la carte qui doit etre blanc
IOU_DOUBLON = 0.75             # recouvrement au-dela duquel deux detections = la meme carte (escalier ~0.5)

# Lissage des coins
ALPHA_LISSAGE = 0.25
SAUT_MAX_COINS = 25

# Suivi / verrouillage
TAILLE_HISTORIQUE = 12
FRAMES_MIN_CONFIRMATION = 7    # votes identiques necessaires pour verrouiller
FRACTION_SUIVI = 0.35          # meme carte si le centre bouge de moins de 35% de sa largeur
FRAMES_ABSENCE_MAX = 20        # frames sans detection avant de considerer la carte retiree
FRAMES_MIN_APPARITION = 4      # frames de presence avant d'afficher une nouvelle carte
FRAMES_ABSENCE_NON_CONFIRMEE = 3   # une detection fantome disparait apres 3 frames
DISTANCE_MEME_CARTE = 0.20     # centres a moins de 20% de la largeur = meme carte
                               # (une carte en escalier est decalee de ~35%+)
IOU_SUIVI = 0.60               # recouvrement min pour dire "c'est la meme carte qu'avant"
                               # (> 0.5 sinon une piste peut sauter sur la carte posee par-dessus)


# ---------------------------------------------------------------------------
# Geometrie
# ---------------------------------------------------------------------------

def rotation(points, angle):
    c, s = np.cos(angle), np.sin(angle)
    return points @ np.array([[c, s], [-s, c]], dtype=np.float32)


def orientation_dominante(poly):
    """Angle (mod 90 deg) des cotes de la silhouette, pondere par leur
    longueur. Toutes les cartes d'un paquet ont a peu pres le meme angle."""
    aretes = np.roll(poly, -1, axis=0) - poly
    longueurs = np.linalg.norm(aretes, axis=1)
    angles = np.arctan2(aretes[:, 1], aretes[:, 0])
    z = np.sum(longueurs * np.exp(4j * angles))
    return float(np.angle(z) / 4)


def longueurs_axes(poly_aligne):
    """Plus longue arete horizontale et verticale (repere aligne)."""
    aretes = np.roll(poly_aligne, -1, axis=0) - poly_aligne
    dx, dy = np.abs(aretes[:, 0]), np.abs(aretes[:, 1])
    horiz = dx[dy < 0.2 * dx]
    vert = dy[dx < 0.2 * dy]
    return (horiz.max() if horiz.size else 0.0), (vert.max() if vert.size else 0.0)


# Type de coin -> direction dans laquelle s'etend la carte depuis ce coin
TYPES_COINS = {"HG": (1, 1), "HD": (-1, 1), "BD": (-1, -1), "BG": (1, -1)}


class Silhouette:
    """Masque d'un paquet de cartes (une ou plusieurs cartes qui se
    touchent), dans un repere tourne pour que les cartes soient droites."""

    def __init__(self, contour, forme_image):
        x, y, w, h = cv2.boundingRect(contour)
        m = 10
        self.x0, self.y0 = max(0, x - m), max(0, y - m)
        x1 = min(forme_image[1], x + w + m)
        y1 = min(forme_image[0], y + h + m)
        self.masque = np.zeros((y1 - self.y0, x1 - self.x0), np.uint8)
        cv2.drawContours(self.masque, [contour - [self.x0, self.y0]], -1, 255, -1)
        self.angle = 0.0
        self.centre = np.zeros(2, np.float32)

    def vers_image(self, pts_alignes):
        return (rotation(np.asarray(pts_alignes, np.float32), self.angle) + self.centre).astype(np.float32)

    def dedans(self, pts_alignes):
        """Booleens : chaque point (repere aligne) est-il dans la silhouette ?"""
        p = self.vers_image(np.atleast_2d(pts_alignes))
        xs = np.round(p[:, 0] - self.x0).astype(int)
        ys = np.round(p[:, 1] - self.y0).astype(int)
        h, w = self.masque.shape
        ok = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
        res = np.zeros(len(p), bool)
        res[ok] = self.masque[ys[ok], xs[ok]] > 0
        return res


GRILLE = np.stack(np.meshgrid(np.linspace(0.06, 0.94, 7), np.linspace(0.06, 0.94, 7)), -1).reshape(-1, 2)


def hypotheses_cartes(sil, poly_aligne, W, H):
    """Pour chaque sommet de la silhouette qui ressemble a un coin de carte
    (exterieur vide, interieur plein), on reconstruit la carte complete de
    taille W x H qui partirait de ce coin."""
    d = max(4.0, 0.06 * W)
    cartes = []
    for v in poly_aligne:
        for nom, (sx, sy) in TYPES_COINS.items():
            tests = np.array([
                v + (sx * d, sy * d),     # interieur
                v + (-sx * d, sy * d),    # a cote, dehors
                v + (sx * d, -sy * d),    # au-dessus/dessous, dehors
            ], np.float32)
            dedans = sil.dedans(tests)
            if not dedans[0] or dedans[1] or dedans[2]:
                continue

            echantillons = v + GRILLE * (sx * W, sy * H)
            if sil.dedans(echantillons).mean() < REMPLISSAGE_MIN:
                continue

            hg = np.array([min(v[0], v[0] + sx * W), min(v[1], v[1] + sy * H)], np.float32)
            coins = np.array([hg, hg + (W, 0), hg + (W, H), hg + (0, H)], np.float32)
            cartes.append({"coins_alignes": coins, "visibles": {nom}})

    # Fusion : plusieurs coins visibles d'une meme carte -> une seule carte
    fusion = []
    for c in cartes:
        centre = c["coins_alignes"].mean(axis=0)
        for f in fusion:
            if np.linalg.norm(centre - f["coins_alignes"].mean(axis=0)) < 0.25 * W:
                n = f["n"]
                f["coins_alignes"] = (f["coins_alignes"] * n + c["coins_alignes"]) / (n + 1)
                f["visibles"] |= c["visibles"]
                f["n"] += 1
                break
        else:
            c["n"] = 1
            fusion.append(c)
    return fusion


def iou_cartes(sil, cartes):
    dessin = np.zeros_like(sil.masque)
    for c in cartes:
        pts = sil.vers_image(c["coins_alignes"]) - [sil.x0, sil.y0]
        cv2.fillPoly(dessin, [np.round(pts).astype(np.int32)], 255)
    inter = np.count_nonzero(dessin & sil.masque)
    union = np.count_nonzero(dessin | sil.masque)
    return inter / union if union else 0.0


def cartes_dans_silhouette(contour, forme_image):
    perimetre = cv2.arcLength(contour, True)
    poly = cv2.approxPolyDP(contour, EPSILON_POLY * perimetre, True).reshape(-1, 2).astype(np.float32)
    if len(poly) < 4:
        return []

    sil = Silhouette(contour, forme_image)
    sil.centre = poly.mean(axis=0)
    theta = orientation_dominante(poly)

    meilleur = (-1.0, [])
    # On essaie les 2 orientations possibles (carte debout / couchee) et
    # 2 estimations de la taille ; on garde celle dont les cartes
    # reconstruites collent le mieux a la silhouette.
    for angle in (theta, theta + np.pi / 2):
        sil.angle = angle
        aligne = rotation(poly - sil.centre, -angle)
        max_h, max_v = longueurs_axes(aligne)
        candidats_H = {round(x, 1) for x in (max_v, max_h / RATIO_CARTE) if x > 0}
        for H in candidats_H:
            W = H * RATIO_CARTE
            if W * H < AIRE_MIN:
                continue
            cartes = hypotheses_cartes(sil, aligne, W, H)
            if not cartes:
                continue
            iou = iou_cartes(sil, cartes)
            if iou < IOU_MIN:
                continue
            # Plein de petites cartes peuvent aussi "paver" un escalier de
            # cartes : on penalise le nombre de cartes pour garder la vraie taille.
            score = iou - PENALITE_PAR_CARTE * len(cartes)
            if score > meilleur[0]:
                meilleur = (score, [
                    {"coins": sil.vers_image(c["coins_alignes"]), "visibles": c["visibles"]}
                    for c in cartes
                ])

    return meilleur[1]


def masque_blanc(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    return ((hsv[:, :, 1] <= SAT_MAX_BLANC) & (hsv[:, :, 2] >= VAL_MIN_BLANC)).astype(np.uint8) * 255


def remplir(masque):
    contours, _ = cv2.findContours(masque, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    plein = np.zeros_like(masque)
    cv2.drawContours(plein, contours, -1, 255, -1)
    return plein


def masque_cartes(frame, blanc):
    gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    flou = cv2.GaussianBlur(gris, (5, 5), 0)
    bords = cv2.Canny(flou, 50, 150)
    bords = cv2.morphologyEx(bords, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    objets = remplir(bords)

    # Objets ET blanc : enleve la main / la table. Les trous laisses par
    # l'encre des cartes sont rebouches par remplir(). L'ouverture coupe
    # les petits ponts entre une carte et ce qui la touche.
    cartes = cv2.bitwise_and(objets, remplir(blanc))
    cartes = cv2.morphologyEx(cartes, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    cartes = remplir(cartes)

    contours, _ = cv2.findContours(cartes, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return [c for c in contours if AIRE_MIN <= cv2.contourArea(c) <= AIRE_MAX_GROUPE]


def aire_quad(q):
    return abs(cv2.contourArea(np.asarray(q, np.float32)))


def iou_quads(a, b):
    a = np.asarray(a, np.float32)
    b = np.asarray(b, np.float32)
    inter, _ = cv2.intersectConvexConvex(a, b)
    union = aire_quad(a) + aire_quad(b) - inter
    return inter / union if union > 0 else 0.0


def contour_est_blanc(coins, blanc):
    """Echantillonne une bande a l'interieur du bord de la carte : sur une
    vraie carte c'est du blanc (meme sur les figures). Sur une main, une
    manche, un objet : non."""
    hg, hd, bd, bg = np.asarray(coins, np.float32)
    pts = []
    for retrait in (0.06, 0.11):
        for t in np.linspace(0.15, 0.85, 8):
            haut = hg + t * (hd - hg)
            bas = bg + t * (bd - bg)
            gauche = hg + t * (bg - hg)
            droite = hd + t * (bd - hd)
            pts += [haut + retrait * (bas - haut), bas + retrait * (haut - bas),
                    gauche + retrait * (droite - gauche), droite + retrait * (gauche - droite)]
    pts = np.round(pts).astype(int)
    h, w = blanc.shape
    ok = (pts[:, 0] >= 0) & (pts[:, 0] < w) & (pts[:, 1] >= 0) & (pts[:, 1] < h)
    if ok.sum() < len(pts) * 0.7:
        return False
    return (blanc[pts[ok, 1], pts[ok, 0]] > 0).mean() >= FRACTION_BLANC_MIN


def supprimer_doublons_cartes(cartes):
    """Si deux detections se recouvrent beaucoup, c'est la meme carte."""
    gardees = []
    for c in sorted(cartes, key=lambda c: -len(c["visibles"])):
        for g in gardees:
            if iou_quads(c["coins"], g["coins"]) > IOU_DOUBLON:
                g["visibles"] |= c["visibles"]
                break
        else:
            gardees.append(c)
    return gardees


def detecter_cartes(frame, blanc=None):
    """Retourne une liste de cartes : {"coins": [HG, HD, BD, BG] en portrait,
    "visibles": coins non caches parmi HG/HD/BD/BG}."""
    if blanc is None:
        blanc = masque_blanc(frame)
    cartes = []
    for contour in masque_cartes(frame, blanc):
        cartes.extend(cartes_dans_silhouette(contour, frame.shape))
    cartes = [c for c in cartes if contour_est_blanc(c["coins"], blanc)]
    return supprimer_doublons_cartes(cartes)


# ---------------------------------------------------------------------------
# Redressement
# ---------------------------------------------------------------------------

POINTS_DEST = np.array(
    [[0, 0], [LARGEUR_CARTE - 1, 0], [LARGEUR_CARTE - 1, HAUTEUR_CARTE - 1], [0, HAUTEUR_CARTE - 1]],
    dtype="float32",
)


def warper(frame, coins):
    matrice = cv2.getPerspectiveTransform(np.asarray(coins, np.float32), POINTS_DEST)
    return cv2.warpPerspective(frame, matrice, (LARGEUR_CARTE, HAUTEUR_CARTE))


def lisser_points(nouveaux, precedents):
    if precedents is None:
        return nouveaux
    if np.max(np.linalg.norm(nouveaux - precedents, axis=1)) > SAUT_MAX_COINS:
        return nouveaux
    return (ALPHA_LISSAGE * nouveaux + (1 - ALPHA_LISSAGE) * precedents).astype("float32")


def largeur(coins):
    return float(np.linalg.norm(coins[1] - coins[0]))


# ---------------------------------------------------------------------------
# Config du coin
# ---------------------------------------------------------------------------

def chemin_config_coin():
    return os.path.join(DOSSIER_TEMPLATES, FICHIER_CONFIG_COIN)


def charger_config_coin():
    global COIN_LARGEUR, COIN_HAUTEUR
    chemin = chemin_config_coin()
    if os.path.isfile(chemin):
        with open(chemin, "r") as f:
            config = json.load(f)
        COIN_LARGEUR = config.get("largeur", COIN_LARGEUR)
        COIN_HAUTEUR = config.get("hauteur", COIN_HAUTEUR)
        print(f"Config coin chargee : {COIN_LARGEUR}x{COIN_HAUTEUR} (depuis {chemin})")
    else:
        print(f"Pas de config coin, valeurs par defaut : {COIN_LARGEUR}x{COIN_HAUTEUR}")


def sauvegarder_config_coin():
    os.makedirs(DOSSIER_TEMPLATES, exist_ok=True)
    with open(chemin_config_coin(), "w") as f:
        json.dump({"largeur": COIN_LARGEUR, "hauteur": COIN_HAUTEUR}, f)


# ---------------------------------------------------------------------------
# Isolation du rang (identique a la v3)
# ---------------------------------------------------------------------------

def normaliser(image):
    h, w = image.shape
    echelle = min(TAILLE_FINALE_LARGEUR / w, TAILLE_FINALE_HAUTEUR / h)
    nw = max(1, int(round(w * echelle)))
    nh = max(1, int(round(h * echelle)))
    redim = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_AREA)
    _, redim = cv2.threshold(redim, 127, 255, cv2.THRESH_BINARY)

    canevas = np.zeros((TAILLE_FINALE_HAUTEUR, TAILLE_FINALE_LARGEUR), np.uint8)
    x0 = (TAILLE_FINALE_LARGEUR - nw) // 2
    y0 = (TAILLE_FINALE_HAUTEUR - nh) // 2
    canevas[y0:y0 + nh, x0:x0 + nw] = redim
    return canevas


def _localiser_chiffre(carte_redressee):
    zone = carte_redressee[0:COIN_HAUTEUR, 0:COIN_LARGEUR]
    gris = cv2.cvtColor(zone, cv2.COLOR_BGR2GRAY)

    _, binaire = cv2.threshold(
        cv2.GaussianBlur(gris, (3, 3), 0), 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    binaire[:MARGE_BORD, :] = 0
    binaire[:, :MARGE_BORD] = 0

    if gris.std() < 12:
        return None, None, binaire

    contours, _ = cv2.findContours(binaire, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    aire_min = COIN_LARGEUR * COIN_HAUTEUR * FRACTION_AIRE_MIN
    h_min = COIN_HAUTEUR * FRACTION_HAUTEUR_MIN
    blobs = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if cv2.contourArea(c) < aire_min or h < h_min:
            continue
        if h > 0.6 * COIN_HAUTEUR or w > 0.85 * COIN_LARGEUR:
            continue
        blobs.append((x, y, w, h))

    if not blobs:
        return None, None, binaire

    ax, ay, aw, ah = min(blobs, key=lambda b: b[1])

    x0, y0, x1, y1 = ax, ay, ax + aw, ay + ah
    for (x, y, w, h) in blobs:
        if (x, y, w, h) == (ax, ay, aw, ah):
            continue
        meme_ligne = abs(y - ay) < 0.25 * ah
        meme_taille = abs(h - ah) < 0.3 * ah
        proche = x - (ax + aw) < 0.6 * ah and ax - (x + w) < 0.6 * ah
        if meme_ligne and meme_taille and proche:
            x0, y0 = min(x0, x), min(y0, y)
            x1, y1 = max(x1, x + w), max(y1, y + h)

    chiffre_brut = binaire[y0:y1, x0:x1]
    if chiffre_brut.size == 0:
        return None, None, binaire

    return normaliser(chiffre_brut), (x0, y0, x1 - x0, y1 - y0), binaire


def extraire_coin(carte_redressee):
    chiffre, _, _ = _localiser_chiffre(carte_redressee)
    return chiffre


def extraire_coin_debug(carte_redressee):
    chiffre, boite, binaire = _localiser_chiffre(carte_redressee)
    visu = cv2.cvtColor(binaire, cv2.COLOR_GRAY2BGR)
    if boite is not None:
        x, y, w, h = boite
        cv2.rectangle(visu, (x, y), (x + w, y + h), (0, 255, 0), 1)
    if chiffre is None:
        chiffre = np.zeros((TAILLE_FINALE_HAUTEUR, TAILLE_FINALE_LARGEUR), np.uint8)
    return chiffre, visu


def agrandir(image, facteur=3):
    return cv2.resize(image, None, fx=facteur, fy=facteur, interpolation=cv2.INTER_NEAREST)


# ---------------------------------------------------------------------------
# Reconnaissance
# ---------------------------------------------------------------------------

def charger_templates():
    templates = {}
    if not os.path.isdir(DOSSIER_TEMPLATES):
        print(f"Dossier '{DOSSIER_TEMPLATES}' introuvable, lancez --calibrer d'abord.")
        return templates

    for fichier in os.listdir(DOSSIER_TEMPLATES):
        if not fichier.endswith(".png"):
            continue
        rang = fichier.split("_")[0]
        image = cv2.imread(os.path.join(DOSSIER_TEMPLATES, fichier), cv2.IMREAD_GRAYSCALE)
        if image is None:
            continue
        if image.shape != (TAILLE_FINALE_HAUTEUR, TAILLE_FINALE_LARGEUR):
            image = cv2.resize(image, (TAILLE_FINALE_LARGEUR, TAILLE_FINALE_HAUTEUR))
        templates.setdefault(rang, []).append(image)

    total = sum(len(v) for v in templates.values())
    print(f"{total} echantillon(s) pour {len(templates)} rang(s) : {sorted(templates.keys())}")
    return templates


def score_match(candidat, template):
    d = DECALAGE_MATCH
    agrandi = cv2.copyMakeBorder(candidat, d, d, d, d, cv2.BORDER_CONSTANT, value=0)
    resultat = cv2.matchTemplate(agrandi, template, cv2.TM_CCOEFF_NORMED)
    resultat = np.nan_to_num(resultat, nan=0.0, posinf=0.0, neginf=0.0)
    return float(resultat.max())


def reconnaitre_rang(coin, templates):
    if coin is None or not templates or cv2.countNonZero(coin) == 0:
        return "?", 0.0

    scores = {}
    for rang, echantillons in templates.items():
        s = sorted((score_match(coin, t) for t in echantillons), reverse=True)
        scores[rang] = float(np.mean(s[:TOP_K]))

    meilleur_rang = max(scores, key=scores.get)
    meilleur_score = scores[meilleur_rang]
    if meilleur_score < SEUIL_CONFIANCE:
        return "?", meilleur_score
    return meilleur_rang, meilleur_score


def point_index(coins, coin):
    """Point au milieu de l'index (rang + symbole) du coin HG ou BD."""
    if coin == "BD":
        coins = coins[[2, 3, 0, 1]]
    hg, hd, _, bg = coins
    return hg + 0.10 * (hd - hg) + 0.15 * (bg - hg)


def dans_quadrilatere(point, coins):
    return cv2.pointPolygonTest(coins.astype(np.float32).reshape(-1, 1, 2),
                                (float(point[0]), float(point[1])), False) >= 0


def coins_index_lisibles(carte, dessus=()):
    """Coins d'index (HG et/ou BD) qui ne sont pas caches.
    `dessus` = coins des cartes posees APRES celle-ci (donc par-dessus).
    Un index qui tombe sous une de ces cartes est cache ; un index qui
    tombe sur une carte plus ancienne est visible (cette carte est dessus)."""
    lisibles = []
    for coin in ("HG", "BD"):
        p = point_index(carte["coins"], coin)
        if not any(dans_quadrilatere(p, autre) for autre in dessus):
            lisibles.append(coin)
    return lisibles


def lire_carte(frame, carte, templates, dessus=()):
    meilleur = ("?", 0.0, None)
    for coin in coins_index_lisibles(carte, dessus):
        ordre = carte["coins"] if coin == "HG" else carte["coins"][[2, 3, 0, 1]]
        redressee = warper(frame, ordre)
        rang, score = reconnaitre_rang(extraire_coin(redressee), templates)
        if score > meilleur[1]:
            meilleur = (rang, score, redressee)
    return meilleur


# ---------------------------------------------------------------------------
# Suivi + verrouillage
# ---------------------------------------------------------------------------

def associer(cartes, pistes):
    """Associe chaque detection a la piste qui la recouvre le plus (un a un,
    les meilleurs recouvrements d'abord). Si rien ne recouvre assez, on
    tente par distance des centres (carte qui a bouge vite)."""
    paires = []
    for i, c in enumerate(cartes):
        for j, p in enumerate(pistes):
            iou = iou_quads(c["coins"], p["coins"])
            if iou >= IOU_SUIVI:
                paires.append((iou, i, j))
    paires.sort(reverse=True)

    resultat = [None] * len(cartes)
    pistes_prises = set()
    for _, i, j in paires:
        if resultat[i] is None and j not in pistes_prises:
            resultat[i] = pistes[j]
            pistes_prises.add(j)

    for i, c in enumerate(cartes):
        if resultat[i] is not None:
            continue
        centre = c["coins"].mean(axis=0)
        for j, p in enumerate(pistes):
            # Une carte verrouillee est posee sur la table : on ne l'associe
            # que si le centre est quasi au meme endroit (sa taille estimee
            # peut varier), jamais a la carte posee par-dessus en escalier.
            frac = DISTANCE_MEME_CARTE if p["rang_verrouille"] is not None else FRACTION_SUIVI
            seuil = frac * largeur(c["coins"])
            if j not in pistes_prises and np.linalg.norm(centre - p["coins"].mean(axis=0)) < seuil:
                resultat[i] = p
                pistes_prises.add(j)
                break
    return resultat


def meme_carte(coins_a, coins_b):
    """Gros recouvrement OU centres quasi confondus (taille mal estimee)."""
    if iou_quads(coins_a, coins_b) > IOU_DOUBLON:
        return True
    distance = np.linalg.norm(coins_a.mean(axis=0) - coins_b.mean(axis=0))
    return distance < DISTANCE_MEME_CARTE * max(largeur(coins_a), largeur(coins_b))


def est_affichee(piste):
    return piste["rang_verrouille"] is not None or piste["vu"] >= FRAMES_MIN_APPARITION


def pistes_affichees(suivi):
    return [p for p in suivi.pistes if est_affichee(p)]


class SuiviCartes:
    """Une piste par carte physique. Une fois le rang confirme par le vote,
    il est VERROUILLE : on arrete de relire la carte. La piste (et son
    verrou) survit FRAMES_ABSENCE_MAX frames sans detection, puis est
    supprimee (carte retiree de la table)."""

    def __init__(self):
        self.pistes = []
        self.compteur = 0

    def reinitialiser(self):
        self.pistes = []

    def posees_apres(self, piste):
        """Coins des cartes posees apres `piste` (donc potentiellement
        par-dessus). Les cartes apparues dans la meme frame ne comptent pas
        (on ne sait pas laquelle est dessus : on lira les deux coins)."""
        return [p["coins"] for p in self.pistes
                if p is not piste and est_affichee(p) and p["ordre"] > piste["ordre"]]

    def mettre_a_jour(self, cartes):
        associations = associer(cartes, self.pistes)

        vues = []
        for carte, piste in zip(cartes, associations):
            if piste is None:
                piste = {
                    "coins": carte["coins"],
                    "historique": deque(maxlen=TAILLE_HISTORIQUE),
                    "rang_verrouille": None,
                    "score": 0.0,
                    "ordre": self.compteur,
                    "vu": 0,
                }
            else:
                piste["coins"] = lisser_points(carte["coins"], piste["coins"])
            piste["visibles"] = carte["visibles"]
            piste["absent"] = 0
            piste["vu"] += 1
            vues.append(piste)

        for p in self.pistes:
            if all(p is not v for v in vues):
                p["absent"] += 1
                limite = FRAMES_ABSENCE_MAX if est_affichee(p) else FRAMES_ABSENCE_NON_CONFIRMEE
                if p["absent"] <= limite:
                    vues.append(p)

        self.pistes = self._fusionner_doublons(vues)
        self.compteur += 1
        return [p for p in self.pistes if p["absent"] == 0]

    @staticmethod
    def _fusionner_doublons(pistes):
        """Deux pistes sur la meme carte physique : on garde la verrouillee,
        sinon celle vue le plus souvent, sinon la plus ancienne."""
        priorite = lambda p: (p["rang_verrouille"] is not None, p["vu"], -p["ordre"])
        gardees = []
        for p in sorted(pistes, key=priorite, reverse=True):
            doublon = next((g for g in gardees if meme_carte(p["coins"], g["coins"])), None)
            if doublon is None:
                gardees.append(p)
            elif doublon["absent"] > 0 and p["absent"] == 0:
                # la piste gardee n'a pas ete vue cette frame : elle reprend
                # la position fraiche du doublon
                doublon["coins"], doublon["absent"] = p["coins"], 0
                doublon["visibles"] = p["visibles"]
        return gardees

    @staticmethod
    def voter(piste, rang, score):
        piste["score"] = score
        if rang != "?":
            piste["historique"].append(rang)
        if piste["historique"]:
            rang_maj, nb = Counter(piste["historique"]).most_common(1)[0]
            if nb >= FRAMES_MIN_CONFIRMATION:
                piste["rang_verrouille"] = rang_maj


# ---------------------------------------------------------------------------
# Mains de blackjack
# ---------------------------------------------------------------------------

VALEURS_RANGS = {
    "1": 1, "A": 1,              # l'as vaut 1, ou 11 si ca ne fait pas depasser 21
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    "10": 10, "J": 10, "Q": 10, "K": 10,
}

# Deux cartes sont dans la meme main si leurs rectangles (agrandis de 10%)
# se touchent. Une main en escalier forme donc un seul groupe.
MARGE_REGROUPEMENT = 1.10


def valeur_main(rangs):
    """Retourne (total, soft). soft = un as compte pour 11."""
    total = sum(VALEURS_RANGS.get(r, 0) for r in rangs)
    nb_as = sum(r in ("1", "A") for r in rangs)
    if nb_as and total + 10 <= 21:
        return total + 10, True
    return total, False


def _se_touchent(coins_a, coins_b):
    def agrandir_quad(c):
        centre = c.mean(axis=0)
        return ((c - centre) * MARGE_REGROUPEMENT + centre).astype(np.float32)
    aire, _ = cv2.intersectConvexConvex(agrandir_quad(coins_a), agrandir_quad(coins_b))
    return aire > 0


def regrouper_mains(pistes):
    """Regroupe les pistes en mains (union-find sur les cartes qui se touchent).
    Retourne une liste de mains, chaque main = liste de pistes dans l'ordre
    de pose. Les mains sont triees de gauche a droite."""
    parent = list(range(len(pistes)))

    def racine(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(len(pistes)):
        for j in range(i + 1, len(pistes)):
            if _se_touchent(pistes[i]["coins"], pistes[j]["coins"]):
                parent[racine(i)] = racine(j)

    groupes = {}
    for i, p in enumerate(pistes):
        groupes.setdefault(racine(i), []).append(p)

    mains = [sorted(g, key=lambda p: p["ordre"]) for g in groupes.values()]
    mains.sort(key=lambda g: min(p["coins"][:, 0].min() for p in g))
    return mains


def decrire_main(numero, pistes_main):
    rangs = [p["rang_verrouille"] for p in pistes_main if p["rang_verrouille"] is not None]
    total, soft = valeur_main(rangs)
    centre = np.mean([p["coins"].mean(axis=0) for p in pistes_main], axis=0)
    return {
        "id": numero,
        "cartes": rangs,
        "nb_cartes_detectees": len(pistes_main),
        "complete": len(rangs) == len(pistes_main),   # False si une carte n'est pas encore reconnue
        "valeur": total,
        "soft": soft,
        "blackjack": len(rangs) == 2 and total == 21,
        "bust": total > 21,
        "position": [int(centre[0]), int(centre[1])],
    }


# ---------------------------------------------------------------------------
# Envoi vers l'API
# ---------------------------------------------------------------------------

class EnvoyeurAPI:
    """Envoie l'etat des mains en POST JSON dans un thread separe.
    - n'envoie que quand quelque chose a change (cartes, valeurs)
    - si le serveur est lent ou coupe, la camera continue normalement ;
      seul le DERNIER etat en attente est envoye (pas d'accumulation)."""

    def __init__(self, url, timeout=2.0, entetes=None):
        self.url = url
        self.timeout = timeout
        self.entetes = {"Content-Type": "application/json"}
        self.entetes.update(entetes or {})
        self.file = queue.Queue(maxsize=1)
        self.dernier_envoye = None
        self.statut = "en attente"
        threading.Thread(target=self._boucle, daemon=True).start()

    def publier(self, mains):
        # Ne compare que ce qui compte (pas la position qui bouge de 1 px)
        signature = json.dumps([(m["cartes"], m["nb_cartes_detectees"]) for m in mains])
        if signature == self.dernier_envoye:
            return
        self.dernier_envoye = signature

        message = {"timestamp": time.time(), "nb_mains": len(mains), "mains": mains}
        try:
            self.file.get_nowait()       # jette l'ancien etat pas encore envoye
        except queue.Empty:
            pass
        self.file.put_nowait(message)

    def _boucle(self):
        while True:
            message = self.file.get()
            donnees = json.dumps(message).encode("utf-8")
            requete = urllib.request.Request(self.url, data=donnees, headers=self.entetes, method="POST")
            try:
                with urllib.request.urlopen(requete, timeout=self.timeout) as rep:
                    self.statut = f"OK ({rep.status})"
            except urllib.error.HTTPError as e:
                self.statut = f"erreur HTTP {e.code}"
                print(f"[API] Le serveur a repondu {e.code} : {e.read()[:200]!r}")
            except Exception as e:
                self.statut = "serveur injoignable"
                print(f"[API] Envoi impossible vers {self.url} : {e}")
                self.dernier_envoye = None   # on reessaiera au prochain changement / frame


# ---------------------------------------------------------------------------
# MODE CALIBRATION
# ---------------------------------------------------------------------------

def rien(_):
    pass


def mode_calibration(rang):
    global COIN_LARGEUR, COIN_HAUTEUR

    os.makedirs(DOSSIER_TEMPLATES, exist_ok=True)
    charger_config_coin()

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
    if not cap.isOpened():
        print("Impossible d'ouvrir la camera.")
        return

    cv2.namedWindow("Reglages coin")
    cv2.createTrackbar("Largeur zone", "Reglages coin", COIN_LARGEUR, LARGEUR_CARTE // 2, rien)
    cv2.createTrackbar("Hauteur zone", "Reglages coin", COIN_HAUTEUR, HAUTEUR_CARTE // 2, rien)

    compteur = len([f for f in os.listdir(DOSSIER_TEMPLATES) if f.startswith(f"{rang}_")])
    print(f"Calibration du rang '{rang}' ({compteur} echantillon(s) existant(s)).")
    print("Posez UNE seule carte. Le rectangle vert doit entourer le RANG SEUL.")
    print("ESPACE = capturer, 'q' = terminer.")

    coins_lisses = None

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        COIN_LARGEUR = max(20, cv2.getTrackbarPos("Largeur zone", "Reglages coin"))
        COIN_HAUTEUR = max(20, cv2.getTrackbarPos("Hauteur zone", "Reglages coin"))

        cartes = detecter_cartes(frame)
        affichage = frame.copy()
        for c in cartes:
            cv2.polylines(affichage, [c["coins"].astype(int)], True, (0, 255, 0), 3)
        cv2.putText(affichage, f"Rang {rang} - {compteur} echantillons - ESPACE pour capturer",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow("Calibration", affichage)

        carte = None
        if len(cartes) == 1:
            coins_lisses = lisser_points(cartes[0]["coins"], coins_lisses)
            carte = warper(frame, coins_lisses)
            apercu_chiffre, apercu_zone = extraire_coin_debug(carte)
            cv2.imshow("DEBUG - Zone de recherche", agrandir(apercu_zone))
            cv2.imshow("DEBUG - Chiffre isole", agrandir(apercu_chiffre))
        else:
            coins_lisses = None

        touche = cv2.waitKey(1) & 0xFF
        if touche == ord("q"):
            break

        if touche == ord(" "):
            if carte is None:
                print(f"{len(cartes)} carte(s) detectee(s), il en faut 1 seule.")
                continue

            coin = extraire_coin(carte)
            if coin is None:
                print("Aucun chiffre trouve dans la zone, ajustez les sliders.")
                continue

            cv2.imshow("CAPTURE - 'o' pour garder, autre touche pour annuler", agrandir(coin))
            confirmation = cv2.waitKey(0) & 0xFF
            cv2.destroyWindow("CAPTURE - 'o' pour garder, autre touche pour annuler")

            if confirmation == ord("o"):
                chemin = os.path.join(DOSSIER_TEMPLATES, f"{rang}_{compteur}.png")
                cv2.imwrite(chemin, coin)
                sauvegarder_config_coin()
                print(f"Echantillon sauvegarde : {chemin}")
                compteur += 1
            else:
                print("Capture annulee.")

    cap.release()
    cv2.destroyAllWindows()


# ---------------------------------------------------------------------------
# MODE DETECTION
# ---------------------------------------------------------------------------

def dessiner(affichage, piste, dessus=()):
    coins = piste["coins"].astype(int)
    verrou = piste["rang_verrouille"]
    if verrou is not None:
        couleur = (0, 255, 0) if piste["absent"] == 0 else (0, 140, 0)
        texte = verrou
    else:
        couleur = (0, 165, 255)
        texte = "?"
    cv2.polylines(affichage, [coins], True, couleur, 3)

    # Etiquette sur l'index visible, pour qu'elle reste lisible meme
    # quand la carte est en partie cachee par les suivantes
    lisibles = coins_index_lisibles(piste, dessus) or ["HG"]
    pos = point_index(piste["coins"], lisibles[0]).astype(int)
    cv2.putText(affichage, texte, tuple(pos), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 5)
    cv2.putText(affichage, texte, tuple(pos), cv2.FONT_HERSHEY_SIMPLEX, 1.2, couleur, 2)


def dessiner_main(affichage, main, pistes_main):
    xs = np.concatenate([p["coins"][:, 0] for p in pistes_main])
    ys = np.concatenate([p["coins"][:, 1] for p in pistes_main])
    x, y = int(xs.min()), int(ys.max()) + 35

    if main["bust"]:
        etat, couleur = " BUST", (0, 0, 255)
    elif main["blackjack"]:
        etat, couleur = " BLACKJACK", (0, 215, 255)
    else:
        etat, couleur = "", (255, 255, 255)
    valeur = f"{main['valeur']}" if not main["soft"] or main["valeur"] == 21 else f"{main['valeur'] - 10}/{main['valeur']}"
    attente = "" if main["complete"] else " (...)"
    texte = f"Main {main['id']}: {valeur}{etat}{attente}"
    cv2.putText(affichage, texte, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 5)
    cv2.putText(affichage, texte, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, couleur, 2)


def mode_detection(url_api=None):
    charger_config_coin()
    templates = charger_templates()
    suivi = SuiviCartes()
    envoyeur = EnvoyeurAPI(url_api) if url_api else None
    if envoyeur:
        print(f"Envoi des mains vers {url_api}")

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
    if not cap.isOpened():
        print("Impossible d'ouvrir la camera.")
        return

    print("'q' = quitter, 'r' = deverrouiller toutes les cartes, 's' = capture, 'm' = voir le masque blanc")
    voir_masque = False

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        blanc = masque_blanc(frame)
        cartes = detecter_cartes(frame, blanc)
        pistes_vues = suivi.mettre_a_jour(cartes)
        if voir_masque:
            cv2.imshow("DEBUG - Masque blanc (cartes = blanc)", cv2.resize(blanc, None, fx=0.5, fy=0.5))

        debug_fait = False
        for piste in pistes_vues:
            if piste["rang_verrouille"] is not None:
                continue  # verrouillee : on ne relit plus
            rang, score, redressee = lire_carte(frame, piste, templates, suivi.posees_apres(piste))
            SuiviCartes.voter(piste, rang, score)
            if not debug_fait and redressee is not None:
                coin, zone = extraire_coin_debug(redressee)
                cv2.imshow("DEBUG - Zone (carte en cours)", agrandir(zone, 2))
                cv2.imshow("DEBUG - Coin (carte en cours)", agrandir(coin, 2))
                debug_fait = True

        affichees = pistes_affichees(suivi)
        affichage = frame.copy()
        for piste in affichees:
            dessiner(affichage, piste, suivi.posees_apres(piste))

        groupes = regrouper_mains(affichees)
        mains = [decrire_main(i + 1, g) for i, g in enumerate(groupes)]
        for main, g in zip(mains, groupes):
            dessiner_main(affichage, main, g)
        if envoyeur:
            envoyeur.publier(mains)

        nb_verrou = sum(p["rang_verrouille"] is not None for p in affichees)
        statut_api = f"  API: {envoyeur.statut}" if envoyeur else ""
        cv2.putText(affichage, f"Cartes: {len(affichees)}  verrouillees: {nb_verrou}  mains: {len(mains)}{statut_api}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow("Detection cartes + valeurs", affichage)

        touche = cv2.waitKey(1) & 0xFF
        if touche == ord("q"):
            break
        elif touche == ord("r"):
            suivi.reinitialiser()
            print("Toutes les cartes deverrouillees.")
        elif touche == ord("s"):
            cv2.imwrite("capture_debug.png", frame)
            print("Capture sauvegardee.")
        elif touche == ord("m"):
            voir_masque = not voir_masque
            if not voir_masque:
                cv2.destroyWindow("DEBUG - Masque blanc (cartes = blanc)")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--calibrer", type=str, default=None)
    parser.add_argument("--dossier", type=str, default="templates_rangs_2",
                        help="Dossier des templates (defaut: templates_rangs_2)")
    parser.add_argument("--api", type=str, default=None,
                        help="URL de l'API ou envoyer les mains en POST JSON, "
                             "ex: http://localhost:5000/api/mains")
    args = parser.parse_args()

    DOSSIER_TEMPLATES = args.dossier

    if args.calibrer:
        mode_calibration(args.calibrer)
    else:
        mode_detection(args.api)