# Dossier de Gestion des Risques Pré-Projet
**Nom du Projet :** BelleVibe Casino (Projet 3)  
**Équipe :** Raphael, Jerome, Daniel, Kerian, Andy  
**Date :** Septembre 2026  
**Version :** 1.0  
**Dépôt GitHub :** [Projet-3](https://github.com)
**Responsable du document :** [Andy Douangpanya / Developpeur ]
---

## 1. Introduction et Objectifs
Ce document identifie et analyse les risques potentiels en amont du développement du projet **BelleVibe Casino**. L'objectif est d'anticiper les dérives de budget, de planning ou de qualité technique (notamment le temps réel et la gestion financière des jetons), et de définir des plans d'action immédiats pour l'équipe.

---

## 2. Échelle d'Évaluation (Matrice & Formule du Levier)

### Calcul de la Criticité Initiale
La criticité brute d'un risque se calcule ainsi :  
`Criticité (C) = Probabilité (P) × Impact (I)` (Score de 1 à 25).
*   **Probabilité (P) :** 1 (Très faible) à 5 (Presque certain)
*   **Impact (I) :** 1 (Mineur) à 5 (Critique / Bloquant pour le projet)

### Calcul du Levier de Mitigation (Risk Leverage)
Pour mesurer l'efficacité de nos plans d'action backend et frontend, nous utilisons le calcul du **levier de réduction du risque** :
`Levier = (Criticité Initiale - Criticité Résiduelle) / Effort de mise en place`
*   **Criticité Résiduelle :** Le score du risque *après* application de notre plan d'action.
*   **Effort (E) :** Estimé de 1 (Très facile/rapide) à 5 (Trame technique complexe à coder).
*   *Interprétation :* Un levier **> 1.5** signifie que la mesure est hautement rentable pour l'équipe.

---

## 3. Matrice Synthétique des Risques (Inclus Backend & Base de Données)

| ID | Catégorie | Description du Risque | P | I | C | Mesure de Prévention / Atténuation | E | C. Résiduelle | Levier | Resp. |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **R01** | Temps réel | Désynchronisation des WebSockets entre le croupier en direct et les joueurs. | 3 | 4 | **12** | Mettre en place un heartbeat (ping/pong) et un état global centralisé côté serveur. | 2 | 3 (P1×I3) | **4.5** | Daniel |
| **R02** | Sécurité | Triche du joueur via la modification locale de ses variables de solde (front-end). | 3 | 5 | **15** | **Zéro confiance au front :** Le serveur backend est le seul maître du solde et valide chaque mise. | 1 | 2 (P1×I2) | **13.0** | Jerome |
| **R03** | **Backend / BD** | **Concurrence et corruption du solde lors des requêtes simultanées en Base de Données.** | 3 | 4 | **12** | Utiliser des **transactions ACID** SQL ou des verrous (Locks) en BD pour empêcher le double-débit. | 2 | 3 (P1×I3) | **4.5** | Raphael |
| **R04** | **Backend / BD** | **Perte ou falsification de l'historique des gains/pertes lors d'une déconnexion d'un joueur.** | 2 | 4 | **8** | Écriture asynchrone systématique en BD dès la fin d'une main. Table d'historique en lecture seule (Append-only). | 2 | 2 (P1×I2) | **3.0** | Kerian |
| **R05** | Gestion | Glissement de périmètre : surcharge du Backlog GitHub et retard de livraison. | 4 | 3 | **12** | Définir un MVP strict (Blackjack + Chat fonctionnels). Les autres jeux passent en bonus de fin. | 1 | 3 (P1×I3) | **9.0** | Andy |

---
## 4. Suivi du Projet
Ce document sera mis à jour à chaque sprint d'équipe sur GitHub. Si Daniel ou Raphael constatent des ralentissements ou des bugs majeurs lors des tests d'intégration entre les sockets et la base de données, la probabilité du risque technique sera réévaluée lors du point hebdomadaire.
