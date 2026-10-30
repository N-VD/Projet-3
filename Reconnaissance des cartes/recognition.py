"""
Detection de cartes + valeur, version amelioree avec :
  - templates multiples par rang (plus robuste au bruit/eclairage)
  - correction automatique d'orientation (evite confusion 6/9, 6/8, etc.)
  - stabilisation temporelle (evite que le rang affiche clignote)
  - meilleure tolerance aux cartes partiellement superposees

MODE CALIBRATION (creer/enrichir la bibliotheque)
    python detection_v2.py --calibrer 6
    -> posez la carte, appuyez sur ESPACE PLUSIEURS FOIS (5-8 fois) en
       bougeant tres legerement la carte (petit angle, position) a chaque
       capture. Plus vous avez d'echantillons varies, plus le matching
       sera robuste. 'q' pour terminer ce rang.

MODE DETECTION
    python detection_v2.py
"""

import argparse
import json
import os
from collections import deque, Counter

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Parametres
# ---------------------------------------------------------------------------
RATIO_CARTE = 63 / 88
TOLERANCE_RATIO = 0.30

AIRE_MIN = 3000
AIRE_MAX = 100000

LARGEUR_CARTE = 200
HAUTEUR_CARTE = 280

# Valeurs par defaut si aucune config sauvegardee n'existe encore.
# IMPORTANT : ce n'est plus la taille finale du template, mais la taille
# d'une ZONE DE RECHERCHE plus large avec de la marge. Le chiffre est
# ensuite localise DYNAMIQUEMENT a l'interieur de cette zone (voir
# extraire_coin), donc un leger decalage du warp ne casse plus rien.
COIN_LARGEUR = 90
COIN_HAUTEUR = 150

DOSSIER_TEMPLATES = "templates_rangs_1"
FICHIER_CONFIG_COIN = "config_coin.json"
SEUIL_CONFIANCE = 0.40

# Taille FINALE fixe a laquelle le chiffre localise est redimensionne.
# Comme c'est toujours la meme taille peu importe ou le chiffre tombait
# dans la zone de recherche, le template matching reste coherent.
TAILLE_FINALE_LARGEUR = 60
TAILLE_FINALE_HAUTEUR = 90

# Un contour dans la zone de recherche est considere comme faisant partie
# du RANG (et pas du symbole de couleur en dessous) s'il est situe dans
# les X% du haut de la zone.
FRACTION_HAUTEUR_RANG = 0.62

# Filtre d'aire pour ignorer le bruit (trop petit) et les faux blobs
# type "toute la zone est sombre" (trop grand), exprime en fraction de
# l'aire totale de la zone de recherche.
FRACTION_AIRE_MIN = 0.003
FRACTION_AIRE_MAX = 0.5

PADDING_CHIFFRE = 4  # marge (pixels) ajoutee autour du chiffre localise

# Stabilisation temporelle
TAILLE_HISTORIQUE = 8       # nombre de frames memorisees par carte suivie
FRAMES_MIN_CONFIRMATION = 5  # nb de votes identiques minimum pour valider
DISTANCE_MAX_SUIVI = 80      # distance en pixels pour considerer "meme carte" entre 2 frames


# ---------------------------------------------------------------------------
# Detection de contours (assouplie pour tolerer la superposition)
# ---------------------------------------------------------------------------

def detecter_contours_cartes(frame):
    """Detecte les contours plausibles de cartes. Contrairement a la
    version precedente, on n'exige plus EXACTEMENT 4 sommets : on accepte
    aussi les formes a 4-6 sommets (les cartes superposees creent souvent
    des contours legerement irreguliers a leur intersection) et on utilise
    alors le rectangle englobant a la place du contour brut."""
    gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    flou = cv2.GaussianBlur(gris, (5, 5), 0)
    bords = cv2.Canny(flou, 50, 150)
    noyau = np.ones((5, 5), np.uint8)
    bords_fermes = cv2.morphologyEx(bords, cv2.MORPH_CLOSE, noyau, iterations=2)

    # RETR_LIST plutot que RETR_EXTERNAL : capte aussi les contours internes
    # qui apparaissent la ou deux cartes se chevauchent
    contours, _ = cv2.findContours(
        bords_fermes, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
    )

    rectangles_cartes = []
    for c in contours:
        aire = cv2.contourArea(c)
        if aire < AIRE_MIN or aire > AIRE_MAX:
            continue

        perimetre = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * perimetre, True)

        if len(approx) < 4 or len(approx) > 6:
            continue

        # Rectangle incline englobant (gere mieux les cartes en angle
        # que boundingRect qui donne un rectangle droit)
        rect = cv2.minAreaRect(c)
        (cx, cy), (w, h), angle = rect

        if w == 0 or h == 0:
            continue

        ratio = max(w, h) / min(w, h)
        ratio_carte_cible = max(RATIO_CARTE, 1 / RATIO_CARTE)

        if abs(ratio - ratio_carte_cible) > TOLERANCE_RATIO:
            continue

        boite = cv2.boxPoints(rect)
        rectangles_cartes.append(boite)

    rectangles_cartes = supprimer_doublons(rectangles_cartes)
    return rectangles_cartes


def supprimer_doublons(rectangles, seuil_distance=40):
    """Quand la superposition cree plusieurs contours proches pour la
    meme carte, on ne garde qu'un rectangle par zone (evite les doublons
    a l'affichage)."""
    if not rectangles:
        return []

    centres = [rect.mean(axis=0) for rect in rectangles]
    garder = []
    utilises = set()

    for i, c1 in enumerate(centres):
        if i in utilises:
            continue
        garder.append(rectangles[i])
        for j in range(i + 1, len(centres)):
            if np.linalg.norm(c1 - centres[j]) < seuil_distance:
                utilises.add(j)

    return garder


# ---------------------------------------------------------------------------
# Warp + extraction du coin
# ---------------------------------------------------------------------------

def ordonner_points(pts):
    pts = np.array(pts, dtype="float32").reshape(4, 2)
    ordonnes = np.zeros((4, 2), dtype="float32")

    somme = pts.sum(axis=1)
    ordonnes[0] = pts[np.argmin(somme)]
    ordonnes[2] = pts[np.argmax(somme)]

    diff = np.diff(pts, axis=1)
    ordonnes[1] = pts[np.argmin(diff)]
    ordonnes[3] = pts[np.argmax(diff)]

    return ordonnes


# Facteur de lissage temporel : plus proche de 0 = plus lisse mais plus
# "en retard" sur le mouvement reel ; plus proche de 1 = plus reactif
# mais plus tremblant. 0.25 est un bon compromis pour une carte immobile.
ALPHA_LISSAGE = 0.25


def lisser_points(points_ordonnes, points_precedents):
    """Moyenne mobile exponentielle entre les points de cette frame et
    ceux de la frame precedente, pour eliminer le tremblement du a un
    bruit de quelques pixels sur la detection de contour. Comme
    ordonner_points() garantit deja un ordre coherent (haut-gauche,
    haut-droit, bas-droit, bas-gauche), on peut moyenner point par point
    en toute securite sans risquer de melanger deux coins differents."""
    if points_precedents is None:
        return points_ordonnes

    return (
        ALPHA_LISSAGE * points_ordonnes
        + (1 - ALPHA_LISSAGE) * points_precedents
    ).astype("float32")


def redresser_carte(frame, points, points_precedents=None):
    points_source = ordonner_points(points)

    if points_precedents is not None:
        points_source = lisser_points(points_source, points_precedents)

    points_dest = np.array(
        [
            [0, 0],
            [LARGEUR_CARTE - 1, 0],
            [LARGEUR_CARTE - 1, HAUTEUR_CARTE - 1],
            [0, HAUTEUR_CARTE - 1],
        ],
        dtype="float32",
    )
    matrice = cv2.getPerspectiveTransform(points_source, points_dest)
    carte_redressee = cv2.warpPerspective(frame, matrice, (LARGEUR_CARTE, HAUTEUR_CARTE))
    return carte_redressee, points_source


def chemin_config_coin():
    return os.path.join(DOSSIER_TEMPLATES, FICHIER_CONFIG_COIN)


def charger_config_coin():
    """Charge COIN_LARGEUR/COIN_HAUTEUR depuis le fichier de config s'il
    existe, pour que le mode detection utilise automatiquement la meme
    taille de crop que celle choisie/validee pendant la calibration."""
    global COIN_LARGEUR, COIN_HAUTEUR

    chemin = chemin_config_coin()
    if os.path.isfile(chemin):
        with open(chemin, "r") as f:
            config = json.load(f)
        COIN_LARGEUR = config.get("largeur", COIN_LARGEUR)
        COIN_HAUTEUR = config.get("hauteur", COIN_HAUTEUR)
        print(f"Config coin chargee : {COIN_LARGEUR}x{COIN_HAUTEUR} (depuis {chemin})")
    else:
        print(f"Pas de config coin trouvee, valeurs par defaut : {COIN_LARGEUR}x{COIN_HAUTEUR}")


def sauvegarder_config_coin():
    os.makedirs(DOSSIER_TEMPLATES, exist_ok=True)
    with open(chemin_config_coin(), "w") as f:
        json.dump({"largeur": COIN_LARGEUR, "hauteur": COIN_HAUTEUR}, f)


def _localiser_chiffre(carte_redressee):
    """Coeur de la nouvelle logique : au lieu de supposer que le chiffre
    tombe toujours exactement au meme endroit apres le warp, on cherche
    OU il se trouve reellement a l'interieur d'une zone de recherche
    plus large, puis on recadre dessus dynamiquement.

    Retourne : (chiffre_normalise, boite_xywh_dans_la_zone, zone_binaire)
    boite_xywh est None si aucun chiffre plausible n'a ete trouve."""
    zone = carte_redressee[0:COIN_HAUTEUR, 0:COIN_LARGEUR]
    zone_gris = cv2.cvtColor(zone, cv2.COLOR_BGR2GRAY)
    zone_floue = cv2.GaussianBlur(zone_gris, (3, 3), 0)

    _, zone_binaire = cv2.threshold(
        zone_floue, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    # Fermeture morphologique : reconnecte les traits d'un meme chiffre
    # (utile surtout pour le "10", ou le 1 et le 0 sont deux blobs distincts
    # qu'on veut pouvoir regrouper ensuite)
    noyau = np.ones((3, 3), np.uint8)
    zone_binaire = cv2.morphologyEx(zone_binaire, cv2.MORPH_CLOSE, noyau)

    contours, _ = cv2.findContours(
        zone_binaire, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    aire_zone = COIN_LARGEUR * COIN_HAUTEUR
    aire_min = aire_zone * FRACTION_AIRE_MIN
    aire_max = aire_zone * FRACTION_AIRE_MAX
    limite_haut = COIN_HAUTEUR * FRACTION_HAUTEUR_RANG

    candidats_rang = []
    tous_les_contours_valides = []

    for c in contours:
        aire = cv2.contourArea(c)
        if aire < aire_min or aire > aire_max:
            continue

        x, y, w, h = cv2.boundingRect(c)
        tous_les_contours_valides.append((x, y, w, h))

        centre_y = y + h / 2
        if centre_y < limite_haut:
            candidats_rang.append((x, y, w, h))

    # On privilegie les contours situes dans le haut de la zone (= le
    # rang). Si aucun n'y est trouve (calibration mal cadree, chiffre
    # plus bas que prevu, etc.), on retombe sur TOUS les contours valides
    # plutot que de ne rien retourner du tout.
    boites = candidats_rang if candidats_rang else tous_les_contours_valides

    if not boites:
        return None, None, zone_binaire

    x0 = min(b[0] for b in boites)
    y0 = min(b[1] for b in boites)
    x1 = max(b[0] + b[2] for b in boites)
    y1 = max(b[1] + b[3] for b in boites)

    x0 = max(0, x0 - PADDING_CHIFFRE)
    y0 = max(0, y0 - PADDING_CHIFFRE)
    x1 = min(COIN_LARGEUR, x1 + PADDING_CHIFFRE)
    y1 = min(COIN_HAUTEUR, y1 + PADDING_CHIFFRE)

    chiffre_brut = zone_binaire[y0:y1, x0:x1]

    if chiffre_brut.size == 0:
        return None, None, zone_binaire

    chiffre_normalise = cv2.resize(
        chiffre_brut, (TAILLE_FINALE_LARGEUR, TAILLE_FINALE_HAUTEUR)
    )

    return chiffre_normalise, (x0, y0, x1 - x0, y1 - y0), zone_binaire


def extraire_coin(carte_redressee):
    """Version simple : retourne juste le chiffre normalise, pret pour
    le template matching. Utilisee en mode detection."""
    chiffre, _, zone_binaire = _localiser_chiffre(carte_redressee)

    if chiffre is None:
        # Rien trouve : on retourne quand meme une image de la bonne
        # taille (toute noire) pour ne pas faire planter le matching,
        # le score de confiance sera simplement tres bas.
        return cv2.resize(
            zone_binaire, (TAILLE_FINALE_LARGEUR, TAILLE_FINALE_HAUTEUR)
        )

    return chiffre


def extraire_coin_debug(carte_redressee):
    """Version debug : retourne aussi une visualisation de la zone de
    recherche avec un rectangle autour du chiffre detecte, pour vous
    permettre de VOIR ce que le code a choisi avant de sauvegarder."""
    chiffre, boite, zone_binaire = _localiser_chiffre(carte_redressee)

    zone_visu = cv2.cvtColor(zone_binaire, cv2.COLOR_GRAY2BGR)
    if boite is not None:
        x, y, w, h = boite
        cv2.rectangle(zone_visu, (x, y), (x + w, y + h), (0, 255, 0), 2)

    if chiffre is None:
        chiffre = cv2.resize(
            zone_binaire, (TAILLE_FINALE_LARGEUR, TAILLE_FINALE_HAUTEUR)
        )

    return chiffre, zone_visu


# ---------------------------------------------------------------------------
# MODE CALIBRATION - plusieurs echantillons par rang
# ---------------------------------------------------------------------------

def rien(x):
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

    # Sliders pour ajuster en direct la TAILLE DE LA ZONE DE RECHERCHE
    # (le chiffre est ensuite localise automatiquement a l'interieur).
    # Elargissez la zone si le rectangle vert (dans la fenetre "Zone de
    # recherche") ne contient pas tout le chiffre.
    cv2.namedWindow("Reglages coin")
    cv2.createTrackbar("Largeur zone", "Reglages coin", COIN_LARGEUR, 200, rien)
    cv2.createTrackbar("Hauteur zone", "Reglages coin", COIN_HAUTEUR, 250, rien)

    # Compter les echantillons deja existants pour ce rang, pour ne pas
    # ecraser ceux deja captures
    existants = [
        f for f in os.listdir(DOSSIER_TEMPLATES) if f.startswith(f"{rang}_")
    ]
    compteur = len(existants)

    print(f"Mode calibration pour le rang '{rang}' (deja {compteur} echantillon(s)).")
    print("Ajustez les sliders si le rectangle vert ne couvre pas tout le chiffre.")
    print("ESPACE pour capturer un echantillon (bougez legerement la carte entre chaque).")
    print("'q' pour terminer ce rang.")

    # Points lisses de la frame precedente, pour stabiliser le warp
    # (voir lisser_points). Remis a None si la carte disparait un instant.
    points_lisses = None

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        # Lire les sliders a chaque frame et mettre a jour les valeurs
        # globales utilisees par extraire_coin()
        COIN_LARGEUR = max(20, cv2.getTrackbarPos("Largeur zone", "Reglages coin"))
        COIN_HAUTEUR = max(20, cv2.getTrackbarPos("Hauteur zone", "Reglages coin"))

        rectangles = detecter_contours_cartes(frame)
        affichage = frame.copy()
        for rect in rectangles:
            cv2.drawContours(affichage, [rect.astype(int)], -1, (0, 255, 0), 3)

        cv2.putText(
            affichage,
            f"Rang {rang} - {compteur} echantillons - ESPACE pour capturer",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )
        cv2.imshow("Calibration", affichage)

        # DEBUG : montrer en direct ce que le warp + la localisation
        # automatique du chiffre donneraient SI on capturait maintenant.
        # "Zone de recherche" montre le rectangle vert = ce que le code a
        # identifie comme etant le chiffre. "Chiffre isole" montre le
        # resultat final normalise, tel qu'il sera sauvegarde.
        if len(rectangles) == 1:
            apercu_carte, points_lisses = redresser_carte(
                frame, rectangles[0], points_lisses
            )
            apercu_chiffre, apercu_zone = extraire_coin_debug(apercu_carte)
            cv2.imshow("DEBUG - Zone de recherche (rectangle = chiffre detecte)", apercu_zone)
            cv2.imshow("DEBUG - Chiffre isole (ce qui sera sauvegarde)", apercu_chiffre)
        else:
            # Carte disparue/perdue : on oublie le lissage pour repartir
            # a zero au prochain contour detecte (evite de "tirer" vers
            # une ancienne position si une nouvelle carte est posee)
            points_lisses = None

        touche = cv2.waitKey(1) & 0xFF

        if touche == ord("q"):
            break

        if touche == ord(" "):
            if len(rectangles) != 1:
                print(f"{len(rectangles)} carte(s) detectee(s), il en faut 1 seule.")
                continue

            carte_redressee, _ = redresser_carte(frame, rectangles[0], points_lisses)
            coin = extraire_coin(carte_redressee)

            # Verification visuelle AVANT sauvegarde : le coin extrait doit
            # clairement montrer LE CHIFFRE SEUL sur fond noir, sans le
            # symbole de couleur en dessous.
            print("Apercu affiche. Appuyez sur 'o' pour confirmer et sauvegarder, "
                  "ou toute autre touche pour annuler cette capture.")
            confirmation = cv2.waitKey(0) & 0xFF

            if confirmation == ord("o"):
                chemin = os.path.join(DOSSIER_TEMPLATES, f"{rang}_{compteur}.png")
                cv2.imwrite(chemin, coin)
                # Sauvegarde la taille de crop choisie, pour que le mode
                # detection utilise automatiquement la meme
                sauvegarder_config_coin()
                print(f"Echantillon sauvegarde : {chemin}")
                print(f"Taille de crop sauvegardee : {COIN_LARGEUR}x{COIN_HAUTEUR}")
                compteur += 1
            else:
                print("Capture annulee.")

    cap.release()
    cv2.destroyAllWindows()


# ---------------------------------------------------------------------------
# MODE DETECTION
# ---------------------------------------------------------------------------

def charger_templates():
    """Charge tous les echantillons, groupes par rang.
    Format attendu : templates_rangs_1/RANG_N.png"""
    templates = {}
    if not os.path.isdir(DOSSIER_TEMPLATES):
        print(f"Dossier '{DOSSIER_TEMPLATES}' introuvable, lancez --calibrer d'abord.")
        return templates

    for fichier in os.listdir(DOSSIER_TEMPLATES):
        if not fichier.endswith(".png"):
            continue
        rang = fichier.split("_")[0]
        chemin = os.path.join(DOSSIER_TEMPLATES, fichier)
        image = cv2.imread(chemin, cv2.IMREAD_GRAYSCALE)
        if image is None:
            continue
        templates.setdefault(rang, []).append(image)

    total = sum(len(v) for v in templates.values())
    print(f"{total} echantillon(s) charge(s) pour {len(templates)} rang(s) : {list(templates.keys())}")
    return templates


def reconnaitre_rang(coin, templates):
    """Compare le coin a TOUS les echantillons de TOUS les rangs, y compris
    une version tournee a 180 degres du coin (au cas ou la carte ait ete
    detectee/redressee a l'envers). On garde le meilleur score global."""
    if not templates:
        return "?", 0.0

    coin_180 = cv2.rotate(coin, cv2.ROTATE_180)

    meilleur_rang = "?"
    meilleur_score = -1.0

    for rang, echantillons in templates.items():
        for template in echantillons:
            for candidat in (coin, coin_180):
                # redimensionner si les tailles different legerement
                if candidat.shape != template.shape:
                    candidat_redim = cv2.resize(
                        candidat, (template.shape[1], template.shape[0])
                    )
                else:
                    candidat_redim = candidat

                resultat = cv2.matchTemplate(
                    candidat_redim, template, cv2.TM_CCOEFF_NORMED
                )
                score = resultat.max()

                if score > meilleur_score:
                    meilleur_score = score
                    meilleur_rang = rang

    if meilleur_score < SEUIL_CONFIANCE:
        return "?", meilleur_score

    return meilleur_rang, meilleur_score


# ---------------------------------------------------------------------------
# Stabilisation temporelle : suivi simple par proximite + vote majoritaire
# ---------------------------------------------------------------------------

class SuiviCartes:
    """Garde un historique des rangs reconnus pour chaque carte suivie
    (identifiee par sa position approximative sur plusieurs frames)."""

    def __init__(self):
        self.pistes = []  # liste de dicts : {centre, historique, id}
        self.prochain_id = 0

    def mettre_a_jour(self, detections):
        """detections : liste de (centre_xy, rang, score)
        Retourne : liste de (centre_xy, rang_stabilise, confirme_bool)"""
        pistes_utilisees = set()
        resultats = []

        for centre, rang, score in detections:
            piste_trouvee = None

            for piste in self.pistes:
                if id(piste) in pistes_utilisees:
                    continue
                distance = np.linalg.norm(np.array(centre) - np.array(piste["centre"]))
                if distance < DISTANCE_MAX_SUIVI:
                    piste_trouvee = piste
                    break

            if piste_trouvee is None:
                piste_trouvee = {
                    "centre": centre,
                    "historique": deque(maxlen=TAILLE_HISTORIQUE),
                    "id": self.prochain_id,
                    "rang_verrouille": None,  # une fois fixe, ne change plus
                }
                self.prochain_id += 1
                self.pistes.append(piste_trouvee)

            piste_trouvee["centre"] = centre
            pistes_utilisees.add(id(piste_trouvee))

            if piste_trouvee["rang_verrouille"] is not None:
                # Rang deja confirme pour cette position : on ignore les
                # nouveaux votes, la carte ne "change" pas de valeur toute
                # seule sur une table. Ca elimine le clignotement.
                resultats.append((centre, piste_trouvee["rang_verrouille"], True, score))
                continue

            piste_trouvee["historique"].append(rang)

            # Vote majoritaire sur l'historique de cette piste
            compte = Counter(piste_trouvee["historique"])
            rang_majoritaire, nb_votes = compte.most_common(1)[0]
            confirme = (
                nb_votes >= FRAMES_MIN_CONFIRMATION and rang_majoritaire != "?"
            )

            if confirme:
                piste_trouvee["rang_verrouille"] = rang_majoritaire

            resultats.append((centre, rang_majoritaire, confirme, score))

        # Supprimer les pistes non revues cette frame (carte retiree de la table)
        self.pistes = [p for p in self.pistes if id(p) in pistes_utilisees]

        return resultats


class LisseurCoins:
    """Comme SuiviCartes, mais uniquement pour lisser les 4 points de
    coin de chaque carte dans le temps (reduit le tremblement du warp).
    Associe chaque nouvelle detection a la plus proche de la frame
    precedente par distance de centre."""

    def __init__(self):
        self.entrees = []  # liste de {centre, points}

    def lisser(self, centre, points_ordonnes):
        entree_trouvee = None
        for entree in self.entrees:
            distance = np.linalg.norm(np.array(centre) - np.array(entree["centre"]))
            if distance < DISTANCE_MAX_SUIVI:
                entree_trouvee = entree
                break

        if entree_trouvee is None:
            points_lisses = points_ordonnes
        else:
            points_lisses = lisser_points(points_ordonnes, entree_trouvee["points"])

        if entree_trouvee is None:
            self.entrees.append({"centre": centre, "points": points_lisses})
        else:
            entree_trouvee["centre"] = centre
            entree_trouvee["points"] = points_lisses

        return points_lisses

    def nettoyer(self, centres_vus):
        """Retire les entrees dont aucune carte n'a ete revue cette
        frame (carte retiree de la table)."""
        encore_valides = []
        for entree in self.entrees:
            for centre in centres_vus:
                if np.linalg.norm(np.array(centre) - np.array(entree["centre"])) < 1:
                    encore_valides.append(entree)
                    break
        self.entrees = encore_valides


def mode_detection():
    charger_config_coin()
    templates = charger_templates()
    suivi = SuiviCartes()
    lisseur = LisseurCoins()
    cap = cv2.VideoCapture(0)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    if not cap.isOpened():
        print("Impossible d'ouvrir la camera.")
        return

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        rectangles = detecter_contours_cartes(frame)

        detections_brutes = []
        centres_cette_frame = []
        for i, rect in enumerate(rectangles):
            centre_brut = tuple(rect.mean(axis=0))

            # Lisser les points AVANT le warp, pour stabiliser l'image
            points_ordonnes = ordonner_points(rect)
            points_lisses = lisseur.lisser(centre_brut, points_ordonnes)

            points_dest = np.array(
                [
                    [0, 0],
                    [LARGEUR_CARTE - 1, 0],
                    [LARGEUR_CARTE - 1, HAUTEUR_CARTE - 1],
                    [0, HAUTEUR_CARTE - 1],
                ],
                dtype="float32",
            )
            matrice = cv2.getPerspectiveTransform(points_lisses, points_dest)
            carte_redressee = cv2.warpPerspective(
                frame, matrice, (LARGEUR_CARTE, HAUTEUR_CARTE)
            )

            coin = extraire_coin(carte_redressee)
            rang, score  = reconnaitre_rang(coin, templates)
            detections_brutes.append((centre_brut, rang, score))
            centres_cette_frame.append(centre_brut)

            # DEBUG : montre en direct le coin de la 1ere carte detectee,
            # pour verifier que le cadrage reste bon en conditions reelles
            if i == 0:
                cv2.imshow("DEBUG - Coin de la 1ere carte", coin)

        lisseur.nettoyer(centres_cette_frame)
        resultats_stables = suivi.mettre_a_jour(detections_brutes)

        affichage = frame.copy()
        for rect, (centre, rang_stable, confirme, score) in zip(rectangles, resultats_stables):
            couleur = (0, 255, 0) if confirme else (0, 165, 255)  # vert si confirme, orange sinon
            cv2.drawContours(affichage, [rect.astype(int)], -1, couleur, 3)

            x, y = int(centre[0]), int(centre[1])
            texte = rang_stable if confirme else f"{rang_stable}?"
            cv2.putText(
                affichage, texte, (x - 20, y),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2,
            )

            cv2.putText(
                affichage, f"{score:.2f}", (x - 20, y - 50 ),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2,
            )

        cv2.putText(
            affichage, f"Cartes: {len(rectangles)}", (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
        )

        cv2.imshow("Detection cartes + valeurs (stabilise)", affichage)

        touche = cv2.waitKey(1) & 0xFF
        if touche == ord("q"):
            break
        elif touche == ord("s"):
            cv2.imwrite("capture_debug.png", frame)
            print("Capture sauvegardee.")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--calibrer", type=str, default=None)
    parser.add_argument(
        "--dossier",
        type=str,
        default="templates_rangs_1",
        help="Dossier ou lire/ecrire les templates (par defaut: templates_rangs_1, "
        "cree relatif au dossier d'ou vous lancez le script)",
    )
    args = parser.parse_args()

    DOSSIER_TEMPLATES = args.dossier

    if args.calibrer:
        mode_calibration(args.calibrer)
    else:
        mode_detection()