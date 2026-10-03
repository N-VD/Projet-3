# BelleVibe Casino

BelleVibe Casino est une plateforme de casino en ligne entièrement dédiée au blackjack, offrant une expérience immersive avec des croupiers en direct diffusés par vidéo. Les joueurs misent en temps réel pendant que le croupier distribue les cartes en direct, créant une atmosphère de casino authentique. La plateforme intègre également un salon de discussion en direct permettant aux joueurs d'échanger entre eux et avec le croupier, ainsi qu'un historique détaillé des gains et des pertes pour chaque session de jeu.

## Équipe:

Raphaël, Jérôme, Daniel, Kerian, Andy

## Créer le fichier d'environnement

```bash
DB_USER="admin"
DB_PASSWORD="bellevibe_casino"
DB_NAME="myapp"
```

## Lancer l'application

Prérequis : Docker Desktop démarré.

Tout d'abord il faut cloner le répertoire, puis lancer cette commande dans la racine du projet :

```bash
docker compose up -d --build
```

Une fois que les containers sont lancés, l'application est disponible sur http://localhost:5173.

## Comptes de démonstration

| Rôle  | Nom d'utilisateur | Courriel             | Mot de passe |
| ------ | ----------------- | -------------------- | ------------ |
| Player | JoueurTest | player@bellevibe.com | 12345678! ||
| Dealer | CroupierTest | dealer@bellevibe.com | 12345678!    |

Ces comptes sont préenregistrés dans la base de données afin de pouvoir faire des tests.

## Tests

À la racine du dépôt pendant que le docker est en train de rouler :

```
docker compose exec backend npm test
```

Cette commande construit le client puis exécute les tests du serveur.

## Ce qui est simulé

- **Connexion / Créer un compte**: Lorsqu'on arrive sur l'application, cela nous demande si l'on veut se connecter, créer un compte ou continuer en tant qu'invité. Si on choisit invité, dans la navbar, il y a l'option de se connecter.
- **Ajouter / Retirer de l'argent fictif** : Permet de modifier le solde du joueur dans la gestion de son compte : http://localhost:5173/compte
- **Voir les salons actifs** : Lorsque sur la page d'accueil nous avons accès au jeu de blackjack et nous pouvons par la suite voir et joindre les salons actifs créés par un dealer.
- **Joindre un salon et jouer contre le dealer** : Lorsqu'un dealer a créé un salon, les joueurs peuvent le rejoindre et jouer contre le dealer qui est pour l'instant seulement automatique, puisque nous n'avons pas encore lié le flux vidéo.

## Liens utiles

- [BackLog](https://github.com/N-VD/Projet-3/blob/main/Doc/02-Backlog.md)
- [Doccuments](https://github.com/N-VD/Projet-3/tree/main/Doc)
- [Journal](https://github.com/N-VD/Projet-3/blob/main/Doc/Journal.md)
- [Consignes / Site web du cours](https://archambaultv.github.io/2026A-420-5D1-MA-Gr2/)
