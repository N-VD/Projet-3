# Route

## Authentification

    accéder a son compte
        * POST /login

    créer un compte

    * POST /createAcount

    Deconnecter
    * Get /logOut

## Compte

    modifer le mot passe

    * PATCH /chMdp

## Compte

 1. POST /signUp : L'utilisateur pourra creer un compte afin de pourvoir  jouer des parties  
 2. POST /login : L'utilisateur pourra se connecter a un compte existant pour accéder a son compte personnel

 3. POST /logOut L'utilisateur pourra se deconnecter de son compte personnel afin d'eviter qu'un personne puisse prendre son compte durant la session ouverte.

## Portefeuille

1. POST /addMonney and POST /takeMonney L'utilisateur pourra ajouter de l'argent virtuelle afin de continuer les parties ou convertir argent virtuelle en argent reel.

## Blackjack
1. GET /game/seeCard les joueurs pourront voir les cartes que le Deeler a distribuer.

## 	Dealer
1. POST /newGame Les Dealer pourront creer une partie





    * GET /hist

    banissement

    * PATCH /ban

    supprimer le compte

    * DELETE /supCompte

## Blackjack (en jeux)

    Voir les salons de joueur
    *   GET /salon

    rejoin une partie

    * POST /join

    Modification de role

    * POST /{id}/chrole

## Choix technique

| Technologie Choisie | Pourquoi ?                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------- |
| NoSQL               | Permet de ne pas avoir de structure exacte pour la flexibilité.                         |
| React               | Cela permet d'avoir un environnement dynamique et donne accès au server side rendering. |
| Caméra / Python    | Avoir une IA qui permet d'identifier des objets réels tel que des cartes                |
