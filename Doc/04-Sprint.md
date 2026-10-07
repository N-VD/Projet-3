# Sprints

|   Sprints   | Durée              | Livrable       | Notions disponible à ce moment                                                                                           | Ce qu'il est réaliste d'y mettre                                                                                          |
| :---------: | :------------------ | :------------- | :------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| **1** | ~ Environ 3 semaine | Apha           | Docker, base de données relationnelle, rendu côté serveur avec un cadriciel full stack, tests et intégration continue | Un système d'authentification et de connexion fonctionnelle, plus une version alpha de la création de salon de Blackjack |
| **2** | ~ Environ 3 semaine | Beta           | Authentification externe (OAuth 2 / OIDC), rôles et autorisations, programmation sécurisée, protocole WebSocket        | Avoir un menu pour choisir un salon et pouvoir jouer des parties de blackjack                                              |
| **3** | ~ Environ 5 semaine | Version Finale | Bibliothèques temps réel, présence et état partagé, gestion de la concurrence, déploiement                          | Ajout de multiple fonctionnalité apportant de la quality of life                                                          |

# Sprint 1

## Planification (bloc du 14 septembre)

**Objectif du sprint :** Permettre à un visiteur de devenir joueur (compte, connexion, portefeuille) et à un dealer de créer et terminer un salon où les cartes distribuées sont visibles.

### Récits engagés

| #  | Récit                         | Épique      | Points | Priorité | Ordre d'abandon |
| -- | ------------------------------ | ------------ | ------ | --------- | --------------- |
| 1  | Créer un compte               | Comptes      | 5      | Must      | 7 (dernier)     |
| 2  | Se connecter                   | Comptes      | 3      | Must      | 6               |
| 3  | Se déconnecter                | Comptes      | 1      | Must      | 4               |
| 9  | Retirer et ajouter de l'argent | Portefeuille | 5      | Must      | 3               |
| 19 | Voir les cartes distribuées   | Blackjack    | 8      | Must      | 2               |
| 21 | Créer un salon (dealer)       | Dealer       | 8      | Must      | 5               |
| 22 | Terminer un salon (dealer)     | Dealer       | 3      | Must      | 1 (premier)     |

**Total engagé :** 33 points
**Capacité de l'équipe :** 33
**Responsable de la mêlée :** Jérôme Hudon

> Note : la planification n'a pas été mise à jour après la rencontre de soumission du 14 septembre. La section ci-dessus reflète le plan initial du sprint 1 (récits 1, 2, 3, 9, 19, 21 et 22).

## Bilan (remise du 6 octobre)

- **Points engagés :** 33 (récits 1, 2, 3, 9, 19, 21 et 22).
- **Points livrés :** 44, soit 25 points engagés (récits 1, 2, 3, 9, 21 et 22) plus 19 points avancés des sprints 2 et 3 (récits 12, 13, 15, 16 et 18). Le récit 19 n'est pas terminé et vaut 0 point.
- **Vélocité réelle :** 44 points.
- **Récits abandonnés :** récit 19 (Voir les cartes distribuées, 8 points) : la fonctionnalité est implémentée, mais incomplète. Il est reporté au sprint 2.
- **Pourquoi :** Puisque la création de l'IA python pour la détection des cartes était une technologie inconnue, nous avons sous-estimé l'amplitude du récit. Notre capacité était mal estimée. Le sprint 2 sera planifié avec la vélocité de 44, en y reportant le récit 19 et en retirant les récits déjà livrés.
