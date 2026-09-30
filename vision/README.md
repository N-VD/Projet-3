# Vision : reconnaissance des cartes du blackjack live

Un croupier distribue de vraies cartes devant une caméra. Ce service Python les reconnaît
avec OpenCV et les envoie au backend, qui applique les règles du blackjack et gère les mises.

```
caméra / écran / démo ──► serveur.py (OpenCV) ──POST /live/vision──► backend Node (règles, argent)
                               │                                        │
                               └── vidéo MJPEG :8000/video ──► page React /jeux/live ◄── GET /live/table
```

## Démarrage rapide (démo, sans caméra)

Avec Docker, `docker compose up` lance aussi ce service en mode démo.

En local :

```bash
cd vision
python -m venv .venv
.venv\Scripts\activate          # Windows (macOS / Linux : source .venv/bin/activate)
pip install -r requirements.txt
python serveur.py --source demo
```

Le mode démo dessine une table virtuelle et un croupier automatique qui pose des cartes
quand le backend en attend. Les images passent par le même détecteur qu'une vraie caméra :
toute la chaîne est testée. Ouvrez ensuite http://localhost:5173/jeux/live.

## Avec une vraie table

0. **Arrêter la vision de démo** si Docker tourne (un conteneur n'a pas accès à la webcam sous
   Windows, et les deux enverraient des cartes au backend) : `docker compose stop vision`.
1. **Apprendre votre jeu de cartes** (une seule fois) : `python calibrer.py --camera 0`.
   Posez une carte à la fois et tapez son nom dans la fenêtre vidéo : le rang (`A`, `2`…`9`,
   `0` pour 10, `J`, `Q`, `K`) puis la couleur (`P` pique, `C` coeur, `K` carreau, `T` trèfle).
   Les rangs et couleurs encore à apprendre sont affichés en haut ; Échap pour quitter.
   Les modèles sont enregistrés dans `modeles/perso`.
2. **Lancer le service** : `python serveur.py --source camera --camera 0 --fenetre`
   (ou `--source ecran --ecran x,y,largeur,hauteur` pour lire un flux affiché à l'écran).
3. **Cadrer la caméra** : la zone du croupier est en haut (42 % de l'image, réglable avec
   `--ligne-croupier`), les 5 places sont des bandes verticales en dessous. Les lignes sont
   dessinées sur la vidéo, et la zone qui attend une carte est encadrée en jaune.

Conseils de pose : tapis uni et foncé, bon éclairage sans reflet, cartes **à plat et sans se
chevaucher** (le détecteur repère chaque carte par son contour).

## Console du croupier (`/croupier`)

Réservée aux comptes dont le `role` est `croupier` ou `admin` (à modifier dans la collection
`comptes`, par exemple avec mongo-express sur http://localhost:8081, puis se reconnecter).
Un bouton « Console croupier » apparaît alors dans la barre de navigation.

- **Consigne en grand** : quoi faire maintenant et quelle zone attend une carte.
- **Fermer les mises** sans attendre la fin du chrono.
- **Saisie manuelle** d'une carte que la caméra ne lit pas : elle est donnée à la zone qui en
  attend une. Une manche entière peut se jouer ainsi si la vision est hors ligne.
- **Table ramassée** : lance la manche suivante si la caméra ne voit pas que la table est vide.
- **Annuler la manche** (fausse donne) : toutes les mises, doubles, splits et side bets compris,
  sont remboursées.
- **Journal** : cartes ignorées, saisies manuelles, annulations.

## Déroulement d'une manche (backend/jeux/blackjackLive.js)

| Phase | Ce qui se passe | Consigne affichée au croupier |
|---|---|---|
| `mises` | 15 s à partir de la première mise | « Faites vos jeux : ne distribuez pas encore » |
| `distribution` | chaque place, le croupier, puis chaque place | « Distribuez une carte pour la place 2 » |
| `decisions` | 15 s par décision, place par place (sinon : rester) | « Donnez une carte à la place 3 » |
| `croupier` | tire jusqu'à 17 (reste sur 17 souple) | « Croupier à 15 : TIREZ une carte » |
| `resultats` | gains versés immédiatement, affichés 8 s | « Paiement des gains » |
| `nettoyage` | attend que la caméra voie la table vide | « Ramassez toutes les cartes » |

Règles : 6 paquets, blackjack payé 3:2, pas de carte cachée (le croupier reçoit sa 2ᵉ carte après
les joueurs), double sur deux cartes, jusqu'à 4 mains par split, as séparés : une carte chacun.
Si le croupier fait blackjack, seules les mises initiales sont perdues (doubles et splits rendus).
Side bets Paires parfaites et 21+3 comme au blackjack solo.

## Fiabilité de la lecture

- Une carte n'est envoyée qu'après avoir été lue de façon identique sur 5 images de suite.
- Le backend ne tient compte que des **nouvelles** cartes d'une zone : une carte masquée
  un instant par la main du croupier n'est pas « retirée ».
- Une carte posée au mauvais endroit (place vide, mauvais tour) est ignorée et signalée.
- Les mises ne ferment pas tant qu'il reste des cartes sur la table.

## Configuration

| Option / variable | Défaut | Rôle |
|---|---|---|
| `--backend` / `BACKEND_URL` | `http://localhost:3000` | adresse du backend |
| `--cle` / `LIVE_CLE_VISION` | `cle-vision-dev` | clé partagée avec le backend (à changer en production, des deux côtés) |
| `--port` / `VISION_PORT` | `8000` | port du flux vidéo |
| `--modeles` | `modeles/demo` en démo, sinon `modeles/perso` | modèles de reconnaissance |
| `VITE_VISION_URL` (frontend) | `http://localhost:8000` | adresse du flux vidéo vue par le navigateur |
