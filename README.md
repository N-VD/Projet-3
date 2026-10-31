# BelleVibe Casino

BelleVibe Casino est une plateforme de casino en ligne entièrement dédiée au blackjack, offrant une expérience immersive avec des croupiers en direct diffusés par vidéo. Les joueurs misent en temps réel pendant que le croupier distribue les cartes en direct, créant une atmosphère de casino authentique. La plateforme intègre également un salon de discussion en direct permettant aux joueurs d'échanger entre eux et avec le croupier, ainsi qu'un historique détaillé des gains et des pertes pour chaque session de jeu.

## Équipe:

Raphaël, Jérôme, Daniel, Kerian, Andy

## Créer le fichier d'environnement

```bash
DB_USER="admin"
DB_PASSWORD="bellevibe_casino"
DB_NAME="myapp"

GITHUB_CLIENT_ID="v23liBGIMJCBKO9QRpr"
GITHUB_CLIENT_SECRET="841528215a85ca7950b77dcce321b2781ac2621f"
```

## Lancer l'application

Prérequis : Docker Desktop démarré.

Tout d'abord il faut cloner le répertoire, puis lancer cette commande dans la racine du projet :

```bash
docker compose up -d --build
```

Une fois que les containers sont lancés, l'application est disponible sur http://localhost:5173.

## Comptes de démonstration

| Rôle  | Nom d'utilisateur | Courriel             | Mot de passe |
| ------ | ----------------- | -------------------- | ------------ |
| Player | JoueurTest        | player@bellevibe.com | 12345678!    |
| Dealer | CroupierTest      | dealer@bellevibe.com | 12345678!    |

Ces comptes sont préenregistrés dans la base de données afin de pouvoir faire des tests.

## Tests

À la racine du dépôt pendant que le docker est en train de rouler :

```
docker compose exec backend npm test
```

Cette commande construit le client puis exécute les tests du serveur.

## Ce qui est simulé

Certaines parties du projet sont simulées, car le flux vidéo du croupier n'est pas encore relié à l'application.

- **Argent fictif** : aucun paiement réel. Le solde se modifie librement dans la page de gestion du compte (http://localhost:5173/compte) avec les boutons « Ajouter de l'argent » et « Retirer de l'argent ». Chaque dépôt et retrait est enregistré dans l'historique des transactions de cette page. Le compte de démonstration `JoueurTest` commence avec 1000 $.
- **Croupier automatique** : il n'y a ni vrai croupier ni vidéo. Les cartes viennent d'un sabot de 6 paquets mélangé dans le navigateur. Le croupier tire automatiquement jusqu'à 17, et le blackjack paie 3 pour 2.
- **Lancement automatique de la manche** : dès qu'un joueur a placé une mise, un compte à rebours de 10 secondes démarre, puis les cartes sont distribuées sans que le croupier ait à intervenir.
- **Reconnaissance des cartes** : le script Python du dossier `Reconnaissance des cartes/` détecte les cartes et calcule la valeur des mains à partir d'une caméra. C'est un prototype séparé : il n'est pas encore branché sur le serveur, donc il n'a aucun effet sur les parties de l'application.

### Ce qu'on peut tester

- **Connexion / Créer un compte** : en arrivant sur l'application, une fenêtre propose de se connecter, de créer un compte ou de continuer en tant qu'invité. La connexion avec GitHub est aussi disponible. En mode invité, le bouton de connexion reste accessible dans la barre de navigation.
- **Créer un salon (dealer)** : avec le compte `CroupierTest`, ouvrir le blackjack pour créer un salon ou fermer un salon qu'on a créé.
- **Rejoindre un salon et jouer (player)** : avec le compte `JoueurTest`, choisir un salon actif et un siège (6 places au maximum), miser, puis jouer (tirer, rester ou séparer). La mise est débitée au début de la manche et les gains sont crédités à la fin.
- **Temps réel** : les actions sont diffusées par Socket.io. En ouvrant deux navigateurs (ou une fenêtre privée) avec deux comptes, chaque joueur voit la table se mettre à jour.
- **Mode spectateur** : http://localhost:5173/spectateur affiche les salons actifs et permet de suivre une partie sans y jouer, même sans être connecté. La carte cachée du croupier n'y est révélée qu'à la fin de la manche.

## Liens utiles

- [BackLog](https://github.com/N-VD/Projet-3/blob/main/Doc/02-Backlog.md)
- [Doccuments](https://github.com/N-VD/Projet-3/tree/main/Doc)
- [Journal](https://github.com/N-VD/Projet-3/blob/main/Doc/Journal.md)
- [Consignes / Site web du cours](https://archambaultv.github.io/2026A-420-5D1-MA-Gr2/)
