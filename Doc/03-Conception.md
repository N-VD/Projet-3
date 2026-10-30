# Conception — BelleVibe Casino

Ce document décrit l'architecture **telle qu'elle est dans le code** (branche `testMain`), pas l'architecture visée. Quand un élément est prévu mais pas encore branché, c'est écrit explicitement.

## 1. Vue d'ensemble

```
            Navigateur (React SPA, port 5173)
              │                         │
   REST + JWT │ (fetch)                 │ Socket.IO (diffusion de l'état des tables)
              ▼                         ▼
        ┌───────────────────────────────────────┐
        │  Backend Node 20 — Express 5 + Socket.IO │  port 3000 (un seul serveur HTTP)
        └───────────────────────────────────────┘
              │ Mongoose                │ fetch (OAuth)
              ▼                         ▼
        MongoDB 7 (port 27017)      API GitHub
              ▲
        mongo-express (port 8081, consultation de la base en dev)

  À part : « Reconnaissance des cartes » — script Python/OpenCV autonome, non relié au backend.
```

L'ensemble se lance avec `docker compose up` (`docker-compose.yaml`) :

| Service           | Image / build            | Port  | Rôle                                                                 |
| ----------------- | ------------------------ | ----- | --------------------------------------------------------------------- |
| `db`            | `mongo:7`              | 27017 | Base de données, volumes `db_data` et `db_config`                |
| `backend`       | `./BackEnd` (Node 20)  | 3000  | API REST + Socket.IO, relancé par `nodemon` à chaque modification |
| `frontend`      | `./frontend` (Node 20) | 5173  | Serveur de développement Vite                                        |
| `mongo-express` | `mongo-express:1`      | 8081  | Interface web pour consulter la base                                  |

La configuration (identifiants Mongo, port, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) est dans le `.env` à la racine, non versionné. S'il est absent, `app.js` en crée un avec des valeurs par défaut.

## 2. Organisation du code

### Backend (`BackEnd/`)

| Fichier / dossier           | Contenu                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.js`                  | Point d'entrée : charge le `.env`, connecte Mongo, monte les routeurs et Socket.IO                                                      |
| `fonctionsCommunes.js`    | Middleware `authentifier` (vérifie le JWT), `genererToken`, validations (champs, mot de passe, âge)                                  |
| `Routes/Comptes.js`       | Inscription, connexion, profil, suppression de compte                                                                                      |
| `Routes/OAuthGithub.js`   | Connexion et inscription via GitHub                                                                                                        |
| `Routes/Portefeuille.js`  | Solde, dépôts, retraits, historique des transactions                                                                                     |
| `Routes/Salon.js`         | Tables de blackjack : création, entrée d'un joueur, mise à jour de partie, vue spectateur                                               |
| `jeux/reglementSalon.js`  | Calcul du résultat et du retour (gain) de chaque main en fin de manche                                                                    |
| `jeux/blackjack.js`       | Moteur de blackjack côté serveur (distribution, actions possibles, split, double). **Non utilisé par les routes pour l'instant.** |
| `sockets/socketServer.js` | Serveur Socket.IO (salles par salon, relais de l'état de la table)                                                                        |
| `models/`                 | Schémas Mongoose (voir section 6)                                                                                                         |
| `initComptes.js`          | Crée les comptes de démonstration au premier démarrage sur une base vide                                                                |
| `tests/`                  | Tests `node:test` + `supertest` (`npm test`)                                                                                         |

### Frontend (`frontend/src/`)

| Fichier / dossier                     | Contenu                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `main.jsx`, `Routeur.jsx`         | Démarrage React, routes (`react-router-dom`), état connecté / invité            |
| `Pages/Login.jsx`, `Register.jsx` | Connexion (identifiant + mot de passe, ou bouton GitHub) et inscription               |
| `Pages/GithubCallback.jsx`          | Retour de GitHub : connexion, ou formulaire nom + date de naissance la première fois |
| `Pages/AuthPopup.jsx`               | Fenêtre d'accueil : se connecter, s'inscrire ou continuer en invité                 |
| `Pages/Blackjack.jsx`               | Table de jeu : choix du salon, mise, actions (tirer, rester, séparer)                |
| `Pages/reglesBlackjack/`            | Logique de jeu côté client : sabot, valeur des mains, animations                    |
| `Pages/Spectateur*.jsx`             | Liste des tables et vue d'une table pour un invité ou un joueur                      |
| `Pages/Compte.jsx`                  | Profil, solde, dépôt / retrait, historique, changement de nom et de mot de passe    |
| `services/socket.js`                | Connexion Socket.IO unique partagée                                                  |
| `services/oauthGithub.js`           | Lancement du flux GitHub et vérification du `state`                                |
| `tests/`                            | Tests Vitest + Testing Library (`npm test`)                                         |

Interface en **Bulma** + **Font Awesome**. L'adresse de l'API (`http://localhost:3000`) est écrite en dur (`reglesBlackjack/constantes.js`, et aussi directement dans `Login.jsx`, `Register.jsx` et `Compte.jsx`).

### Reconnaissance des cartes (`Reconnaissance des cartes/`)

Script Python autonome (`detection.py`) qui lit la caméra et détecte les cartes et leur rang avec **OpenCV** (contour blanc des cartes, suivi entre les images, comparaison avec les gabarits de `templates_rangs_2/`). Il n'est pas encore relié au backend : l'intégration caméra / Socket.IO est sur la branche locale `camera-socketio`.

## 3. Flux principaux

### Connexion classique

1. `POST /login` avec `identifiant` (nom **ou** courriel) et `password`.
2. Le backend compare le hash bcrypt et renvoie un JWT valable 1 h.
3. Le frontend le range dans `localStorage` et l'envoie ensuite dans `Authorization: Bearer <token>`. Au chargement, `Routeur.jsx` supprime un token expiré.

### Connexion GitHub (OAuth 2, *authorization code*)

1. Le bouton « Se connecter avec GitHub » génère un `state` aléatoire, le garde dans `sessionStorage` et ouvre `GET /auth/github?state=…`.
2. Le backend redirige vers la page d'autorisation GitHub (scope `user:email`).
3. GitHub renvoie sur `/auth/github/callback` (page React). Elle vérifie que le `state` est identique, puis envoie le `code` à `POST /auth/github`.
4. Le backend échange le `code` contre un access token, lit le profil et le courriel principal vérifié de l'utilisateur.
   - `githubId` déjà connu → renvoie un JWT de session.
   - Première connexion → aucun compte créé ; renvoie un **jeton d'inscription** (15 min) et le login GitHub comme nom suggéré.
5. La page demande le nom et la date de naissance, puis appelle `POST /auth/github/inscription`. Le compte (`player`) n'est créé que si l'utilisateur a 18 ans ou plus.

### Partie de blackjack

1. Un croupier crée une table (`POST /createSalon`).
2. Un joueur s'assoit (`POST /addPlayer`, 6 sièges maximum, uniquement quand la table est en attente) et rejoint la salle Socket.IO du salon (`rejoindre_salon`).
3. **La logique de jeu tourne dans le navigateur** : le frontend mélange le sabot, distribue, applique tirer / rester / séparer, puis envoie l'état complet de la table à `PATCH /gameStatus`.
4. Le backend vérifie que l'appelant est croupier, admin ou assis à la table, que `isTurn` correspond à `currentTurnSeat`, puis gère l'argent : débit des mises au démarrage, débit de la mise supplémentaire d'un split, crédit des gains en fin de manche (`jeux/reglementSalon.js`). Chaque mouvement crée une transaction ; un solde insuffisant annule la mise à jour.
5. Le client émet `action_jeu` ; le serveur Socket.IO relaie l'état à tous les clients de la salle (`mise_a_jour_table`).

## 4. API REST

Toutes les routes sont à la racine de `http://localhost:3000`. « JWT » = en-tête `Authorization: Bearer <token>` obligatoire.

### Comptes

| Méthode | Route                       | Auth | Accès    | Description                                                                                                |
| -------- | --------------------------- | ---- | --------- | ---------------------------------------------------------------------------------------------------------- |
| POST     | `/register`               | —   | Tous      | Crée un compte `player` (18 ans min., mot de passe ≥ 8 caractères dont un spécial) et renvoie un JWT |
| POST     | `/login`                  | —   | Tous      | Connexion par nom ou courriel + mot de passe, renvoie un JWT                                               |
| GET      | `/me`                     | JWT  | Connecté | Profil du compte connecté (sans le mot de passe)                                                          |
| PATCH    | `/modifierNomUtilisateur` | JWT  | Connecté | Change le nom d'utilisateur (unique)                                                                       |
| PATCH    | `/modifierMotDePasse`     | JWT  | Connecté | Change le mot de passe (refusé pour un compte GitHub)                                                     |
| DELETE   | `/deleteCompte`           | JWT  | `admin` | Supprime un compte par son `id`                                                                          |

Il n'y a pas de route de déconnexion : le frontend supprime simplement le token.

### OAuth GitHub

| Méthode | Route                        | Auth                | Description                                                                        |
| -------- | ---------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| GET      | `/auth/github?state=…`    | —                  | Redirige vers la page d'autorisation GitHub                                        |
| POST     | `/auth/github`             | —                  | Échange le `code` ; renvoie un JWT, ou un jeton d'inscription la première fois |
| POST     | `/auth/github/inscription` | Jeton d'inscription | Vérifie l'âge, crée le compte `player` et renvoie un JWT                      |

### Portefeuille

| Méthode | Route              | Auth | Description                                                        |
| -------- | ------------------ | ---- | ------------------------------------------------------------------ |
| GET      | `/solde`         | JWT  | Solde du compte connecté                                          |
| POST     | `/ajouterArgent` | JWT  | Dépôt d'un montant > 0, crée une transaction                    |
| POST     | `/retirerArgent` | JWT  | Retrait d'un montant > 0 si le solde suffit, crée une transaction |
| GET      | `/transactions`  | JWT  | Historique des transactions du compte connecté                    |

### Salons et spectateur

| Méthode | Route                             | Auth | Accès                                         | Description                                                                                                                |
| -------- | --------------------------------- | ---- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| POST     | `/createSalon`                  | JWT  | `dealer`, `admin`                          | Crée une table vide en attente                                                                                            |
| GET      | `/salons`                       | JWT  | Connecté                                      | Tables en attente / en cours (le croupier et l'admin voient aussi les terminées)                                          |
| POST     | `/addPlayer`                    | JWT  | `player`                                     | S'asseoir à un siège libre d'une table en attente                                                                        |
| PATCH    | `/gameStatus`                   | JWT  | `dealer`, `admin`, ou joueur de la table   | Enregistre le nouvel état de la partie et règle l'argent                                                                 |
| DELETE   | `/deleteSalon`                  | JWT  | `dealer` créateur de la table, ou `admin` | Ferme une table qui n'est pas en cours de partie                                                                           |
| GET      | `/spectateur/salons`            | —   | Tous (invité compris)                         | Liste des tables ouvertes                                                                                                  |
| GET      | `/spectateur/salons/:id`        | —   | Tous (invité compris)                         | Vue d'une table sans le sabot, sans les identifiants des joueurs et avec la 2e carte du croupier cachée pendant la partie |
| GET      | `/spectateur/compte/salons/:id` | JWT  | Connecté                                      | Même vue, avec en plus le nom des joueurs                                                                                 |

## 5. Événements Socket.IO

Même serveur et même port que l'API (3000), CORS limité à `http://localhost:5173`.

| Sens               | Événement           | Données                    | Effet                                                     |
| ------------------ | --------------------- | --------------------------- | --------------------------------------------------------- |
| Client → serveur  | `rejoindre_salon`   | identifiant du salon        | Le socket rejoint la salle du salon                       |
| Client → serveur  | `action_jeu`        | `{ codeSalon, salonMaj }` | Le serveur relaie l'état reçu à toute la salle         |
| Serveur → clients | `mise_a_jour_table` | `{ salon, message }`      | Les clients de la salle remplacent leur état de la table |

Aucune authentification sur la connexion socket pour l'instant (voir D10).

## 6. Modèle de données

Base MongoDB (`mongo:7`), accédée par Mongoose. MongoDB n'impose aucun schéma : les contraintes ci-dessous (obligatoire, unique, valeur par défaut) sont appliquées par les schémas Mongoose dans `BackEnd/models/`, et les index uniques sont créés par Mongoose au démarrage.

### `comptes` (modèle `Compte`, `models/compte.js`)

| Champ              | Type     | Contraintes                                             | Description                                                    |
| ------------------ | -------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `_id`            | ObjectId | généré                                               | Identifiant interne du compte                                  |
| `nom`            | String   | obligatoire, unique                                     | Nom d'utilisateur (sert aussi d'identifiant de connexion)      |
| `password`       | String   | obligatoire **sauf** si `githubId` est présent | Hash bcrypt (10 tours), jamais le mot de passe en clair        |
| `githubId`       | String   | unique, *sparse*                                      | Identifiant numérique GitHub, absent pour un compte classique |
| `date_naissance` | Date     | obligatoire                                             | Sert à vérifier la majorité (18 ans)                        |
| `email`          | String   | obligatoire, unique                                     | Courriel (identifiant de connexion alternatif)                 |
| `role`           | String   | défaut `player`                                      | `player`, `dealer` ou `admin` (voir section 7)           |
| `montant`        | Number   | défaut `0`                                           | Solde du portefeuille virtuel                                  |
| `created_at`     | Date     | défaut maintenant                                      | Date de création                                              |

`githubId` est un champ distinct de `_id` : l'identifiant GitHub ne remplace jamais l'identifiant interne. L'index *sparse* permet à tous les comptes classiques de ne pas avoir de `githubId` sans violer l'unicité.

### `salons` (modèle `Salon`, `models/salon.js`)

| Champ                          | Type               | Description                                                    |
| ------------------------------ | ------------------ | -------------------------------------------------------------- |
| `_id`                        | ObjectId           | Identifiant du salon                                           |
| `created_by`                 | ObjectId → Compte | Croupier ou admin qui a créé la table (facultatif)           |
| `status`                     | String             | `waiting`, `playing` ou `finished` (défaut `waiting`) |
| `dealer_hand`                | Array de cartes    | Main du croupier                                               |
| `deck`                       | Array de cartes    | Sabot restant (jamais envoyé aux spectateurs)                 |
| `players`                    | Array (sous-doc.)  | Joueurs assis, voir ci-dessous                                 |
| `currentTurnSeat`            | Number             | Siège dont c'est le tour (défaut `0`)                      |
| `created_at`, `updated_at` | Date               | Horodatage                                                     |

Sous-document `players[]` (sans `_id`) :

| Champ          | Type               | Description                                                 |
| -------------- | ------------------ | ----------------------------------------------------------- |
| `id_compte`  | ObjectId → Compte | Joueur assis (obligatoire)                                  |
| `seat_index` | Number             | Numéro du siège (obligatoire)                             |
| `hands`      | Array              | Mains du joueur (plusieurs après un split)                 |
| `resultats`  | Array              | Résultat de chaque main une fois la manche terminée       |
| `activeHand` | Number             | Index de la main en cours de jeu (défaut `0`)            |
| `bet`        | Number             | Mise initiale (défaut `0`)                               |
| `status`     | String             | `waiting` ou `finished`                                 |
| `isTurn`     | Boolean            | Vrai seulement pour le joueur du siège `currentTurnSeat` |

Une main de `hands` est un objet `{ cartes, mise, status, naturel }`, et une carte est un objet `{ rang, ... }` (`rang` ∈ `A`, `2`…`10`, `J`, `Q`, `K`). Les anciens salons qui stockaient une seule main dans `players[].hand` sont convertis vers `hands` au chargement (hook `pre('init')`).

### `transactions` (modèle `Transaction`, `models/transaction.js`)

| Champ          | Type               | Description                                                       |
| -------------- | ------------------ | ----------------------------------------------------------------- |
| `_id`        | ObjectId           | Identifiant                                                       |
| `id_compte`  | ObjectId → Compte | Compte concerné (obligatoire)                                    |
| `desc`       | String             | Libellé (ex. « Mise blackjack en salon », « Mise split … ») |
| `montant`    | Number             | Positif pour un crédit, négatif pour un débit                  |
| `created_at` | Date               | Date du mouvement                                                 |

Chaque dépôt, retrait, mise, mise de split et gain de partie crée une transaction ; `comptes.montant` est mis à jour en même temps.

### `hands` (modèle `hands`, `models/hand.js`)

Historique prévu d'une main jouée (`id_table`, `dealer_hand`, `players[]` avec `hand`, `bet`, `outcome`, `payout`, `played_at`). **Le modèle est défini mais aucune route ne l'utilise : la collection reste vide pour l'instant.**

## 7. Rôles

Les rôles sont une simple chaîne dans `comptes.role`, recopiée dans le JWT et vérifiée par chaque route.

| Rôle      | Comment on l'obtient                                                          | Droits                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `player` | Tout compte créé par `/register` ou par GitHub                            | Portefeuille, s'asseoir à une table et y jouer, vue spectateur avec les noms                                                                             |
| `dealer` | Compte de démonstration `CroupierTest`, ou modification directe en base    | Créer une table, fermer ses propres tables, faire avancer une partie, voir toutes les tables (terminées comprises). Ne peut pas s'asseoir comme joueur. |
| `admin`  | Uniquement par modification directe en base (aucun compte créé par défaut) | Droits du croupier sur **toutes** les tables, et suppression de comptes (`DELETE /deleteCompte`)                                                  |

L'**invité** n'est pas un rôle : il n'a pas de compte, seulement un indicateur `guest` dans le `sessionStorage` du navigateur, et n'accède qu'aux routes publiques `/spectateur/...`.

Au premier démarrage sur une base vide, `initComptes.js` crée deux comptes de démonstration : `JoueurTest` (`player`, 1000 $) et `CroupierTest` (`dealer`).

## 8. Registre de décisions

| #   | Sprint | Décision                                                                                                                                                                                                                                                                                                                         | Alternatives écartées                                                                                          | Pourquoi                                                                                                                                                                                                                                                                                                                                     |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 1      | **MongoDB 7 + Mongoose**                                                                                                                                                                                                                                                                                                    | Base SQL (PostgreSQL, MySQL)                                                                                     | Les tables de jeu ont une structure imbriquée et changeante (joueurs, mains multiples après un split, cartes) qui se stocke naturellement en un seul document. Mongoose remet les validations (obligatoire, unique) qu'une base SQL donnerait par défaut.                                                                                 |
| D2  | 1      | **React 19 + Vite**, application monopage, interface en **Bulma**                                                                                                                                                                                                                                                     | Next.js (rendu serveur), pages HTML servies par Express                                                          | Interface très interactive (table, animations des cartes) sans besoin de référencement, donc pas de rendu serveur. Vite pour un serveur de développement rapide et Vitest pour les tests. Bulma pour une interface correcte sans écrire de CSS de base.                                                                                 |
| D3  | 1      | **Reconnaissance des cartes en Python avec OpenCV**, dans un module séparé                                                                                                                                                                                                                                                | Bibliothèque de vision en JavaScript                                                                            | OpenCV est l'outil de référence pour la vision par ordinateur et n'existe pleinement qu'en Python ; garder le module séparé permet de le développer sans bloquer le reste. Son intégration temps réel (caméra → Socket.IO) est prévue mais pas encore fusionnée.                                                                  |
| D4  | 1      | **Node 20 + Express 5** pour l'API REST                                                                                                                                                                                                                                                                                     | —                                                                                                               | Même langage que le frontend pour toute l'équipe ; Express 5 transmet les erreurs des routes `async` au gestionnaire d'erreurs sans `try/catch` obligatoire.                                                                                                                                                                           |
| D5  | 1      | **Docker Compose** pour l'environnement de développement (base, backend, frontend, mongo-express)                                                                                                                                                                                                                          | Installation locale de MongoDB et Node                                                                           | Une seule commande pour avoir le même environnement sur toutes les machines de l'équipe.                                                                                                                                                                                                                                                   |
| D6  | 2      | **La logique de jeu tourne dans le navigateur** ; le serveur enregistre l'état reçu par `PATCH /gameStatus`, vérifie le tour et gère l'argent                                                                                                                                                                         | Moteur de jeu côté serveur (`jeux/blackjack.js`, déjà écrit)                                              | Plus rapide à livrer et à animer côté interface. **Risque connu** : le sabot est mélangé et les cartes tirées par le client, et le serveur ne vérifie ni les cartes ni la légalité d'un split. Un client modifié peut donc tricher. Le moteur serveur `jeux/blackjack.js` est prêt pour corriger ça.                    |
| D7  | 2      | **OAuth GitHub implémenté sans bibliothèque OAuth** : le flux *authorization code* est codé à la main avec `fetch` (natif dans Node 20) dans `Routes/OAuthGithub.js`                                                                                                                                             | Passport.js (`passport-github2`), `simple-oauth2`                                                            | Un seul fournisseur et trois appels HTTP : une bibliothèque ajouterait des dépendances et un système de session (Passport) qu'on n'utilise pas. Le `state` anti-CSRF est généré et vérifié par le frontend (`sessionStorage`), le *client secret* reste côté backend (`.env`).                                             |
| D8  | 2      | **Session sans état par JWT** : après `/login`, `/register` ou GitHub, le backend signe un JWT (`jsonwebtoken`, HS256, durée 1 h) contenant `id`, `nom`, `role`. Le frontend le garde dans `localStorage` et l'envoie dans `Authorization: Bearer`.                                                      | Session serveur (`express-session`) + cookie                                                                   | Pas de stockage de session côté serveur et même mécanisme pour la connexion classique et GitHub. Limites connues : pas de *refresh token* (reconnexion après 1 h), la déconnexion supprime seulement le token côté client, et le secret de signature est écrit en dur dans `fonctionsCommunes.js` (à déplacer dans `.env`). |
| D9  | 2      | **Un nouveau compte GitHub reçoit le rôle `player`**, et n'est créé qu'après la saisie d'une date de naissance prouvant 18 ans ou plus. Entre les deux, un jeton d'inscription de 15 min, signé avec un secret distinct (inutilisable comme session), transporte le `githubId` et le courriel.                    | Créer le compte dès le retour de GitHub ; lier automatiquement à un compte existant ayant le même courriel   | Même règle que `/register` : on ne s'attribue jamais un rôle soi-même, et on ne crée pas de compte sans vérification d'âge. Si le courriel GitHub appartient déjà à un compte classique, l'inscription est refusée (409) plutôt que de lier les comptes, pour éviter une prise de contrôle de compte.                        |
| D10 | 2      | **Socket.IO** (`socket.io` côté serveur, `socket.io-client` côté React) pour le temps réel, sur le même serveur HTTP et le même port (3000) qu'Express                                                                                                                                                           | `ws` natif, rafraîchissement par *polling*                                                                  | Gestion des salles (`socket.join(salon)`) et reconnexion automatique incluses, ce qui correspond directement aux tables de blackjack.                                                                                                                                                                                                      |
| D11 | 2      | **Le client WebSocket n'est pas authentifié pour l'instant** : la connexion ne transmet aucun token et le serveur accepte `rejoindre_salon` et `action_jeu` de n'importe qui. La socket ne sert qu'à **diffuser** l'état ; toute écriture (mise, action, règlement) passe par l'API REST protégée par JWT. | Vérifier le JWT au *handshake* (`io(url, { auth: { token } })` + middleware `io.use` avec `jwt.verify`) | Choix de rapidité pour ce sprint. **Risque connu** : un client peut rejoindre la salle d'un salon et y diffuser un faux état de table aux autres joueurs. Correctif prévu : vérifier le JWT au handshake, et faire émettre l'état par le serveur après chaque route REST au lieu de relayer celui du client.                    |

## 9. Limites connues

- **Triche possible côté client** : cartes, sabot et validité du split viennent du navigateur (D6).
- **Socket non authentifiée** : faux état de table diffusable dans une salle (D11).
- **Secret JWT en dur** dans `fonctionsCommunes.js` au lieu du `.env` (D8).
- **Pas de double en salon** : le bouton n'existe pas dans `Blackjack.jsx`, seul le moteur serveur non branché le gère.
- **Historique des mains** : le modèle `hands` existe mais rien n'y écrit.
- **`initComptes.js`** importe `./models/Compte` alors que le fichier s'appelle `compte.js` : fonctionne sur Windows, peut échouer sur un système sensible à la casse.
- **URL de l'API en dur** (`http://localhost:3000`) à plusieurs endroits du frontend.
