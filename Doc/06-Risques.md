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

## 2. Registre des Risques

---

### Risque 1 — Désynchronisation entre les membres faute de communication claire

| Critère | Détail |
|---|---|
| **Probabilité** | 7 / 10 |
| **Impact** | Élevé — des contrats d'API ou des structures de données divergentes entre le frontend et le backend obligent à tout refaire en fin de sprint |

**Description**  
Aucun de nous ne travaille au même rythme ni sur les mêmes plages horaires. Si les décisions de structure (ex. : format des événements socket pour les mises, schéma de la table `transactions`) sont prises en DM privé ou verbalement sans être consignées, deux membres peuvent coder deux versions incompatibles de la même fonctionnalité pendant une semaine entière.

**Signal d'alerte**  
Une PR ouverte contient des types ou des routes qui ne correspondent pas à ce qu'une autre PR en cours suppose — détecté au premier test d'intégration entre le module de jeu et la base de données.

**Mesure d'atténuation**  
Toute décision de contrat d'API ou de schéma est documentée dans le canal Discord dédié `#decisions-techniques` dans les 24 h. Si deux membres divergent sur l'implémentation en milieu de sprint 2, on convoque un point de 30 min avant de continuer à coder.

---

### Risque 2 — Remise d'un sprint en retard par accumulation de blocages non signalés

| Critère | Détail |
|---|---|
| **Probabilité** | 7 / 10 |
| **Impact** | Moyen à élevé — un sprint livré incomplet décale le suivant et compresse le temps de test |

**Description**  
Les blocages techniques (bug de socket, problème d'authentification JWT, conflits de merge) ont tendance à être gardés pour soi jusqu'à la veille de la remise. Sur un projet où la couche temps réel conditionne les fonctionnalités de jeu, un blocage non signalé sur les WebSockets peut bloquer trois membres en cascade.

**Signal d'alerte**  
Aucun commit sur une branche de fonctionnalité prioritaire pendant plus de 48 h en pleine période de sprint actif.

**Mesure d'atténuation**  
Stand-up bihebdomadaire obligatoire (mercredi et Vendredi) : chaque membre énonce en deux phrases ce qu'il a fait, ce qu'il fait, et s'il est bloqué. Tout blocage déclaré lors du stand-up est assigné à un binôme pour déblocage dans les 24 h. Si la remise risque de glisser, on en informe le chargé de cours 72 h à l'avance, pas 2 h avant.

---

### Risque 3 — L'expérience de jeu finale ne correspond pas aux attentes fonctionnelles définies

| Critère | Détail |
|---|---|
| **Probabilité** | 5 / 10 |
| **Impact** | Élevé — livrer un casino où la gestion des jetons est incorrecte ou où les règles de jeu ne sont pas respectées invalide la démonstration |

**Description**  
La mécanique de jeu (calcul des gains, logique des mises, équilibre des probabilités) semble simple à définir verbalement mais se traduit rarement en code du premier coup. Si les règles métier ne sont pas spécifiées par écrit avant le développement, chaque membre peut les interpréter différemment et le résultat final ne correspondra à aucune des versions attendues.

**Signal d'alerte**  
Lors de la première session de test de bout en bout (mi-sprint 3), les soldes de jetons après une partie divergent selon le chemin emprunté, ou le comportement du jeu ne peut pas être expliqué par les règles écrites.

**Mesure d'atténuation**  
Avant le début du sprint 2, rédiger une fiche de règles métier d'une page (gains, pertes, cas limites) validée par tout le monde. Les tests d'intégration vérifient ces règles automatiquement ; tout écart déclenche un bug bloquant à corriger avant la suite.

---

### Risque 4 — L'intégration de l'IA produit des résultats imprévisibles ou inutilisables en production

| Critère | Détail |
|---|---|
| **Probabilité** | 8 / 10 |
| **Impact** | Élevé — si l'IA est centrale à une fonctionnalité (croupier virtuel, suggestion de mise, détection de comportement), son dysfonctionnement dégrade l'expérience visible par l'évaluateur |

**Description**  
Personne dans l'équipe n'a déployé un modèle ou une API d'IA dans un contexte temps réel avec contrainte de latence. Les appels à l'API (OpenAI, Gemini ou autre) peuvent dépasser les budgets de tokens, retourner des réponses hors format, ou introduire une latence incompatible avec le rythme d'un jeu en direct.

**Signal d'alerte**  
Lors des tests de charge du sprint 2, le temps de réponse de l'IA dépasse 2 secondes sur trois appels consécutifs, ou le taux d'erreur API dépasse 5 %.

**Mesure d'atténuation**  
Développer dès le sprint 1 un module IA avec une interface claire et un fallback codé en dur (réponse déterministe simulée). Si les appels API sont trop lents ou trop coûteux à mi-sprint 2, on bascule définitivement sur le fallback pour la démo et on documente la décision. Le budget API est plafonné à une limite définie avant de commencer.

---

### Risque 5 — Manque de ressources techniques ou humaines bloque le développement de fonctionnalités clés

| Critère | Détail |
|---|---|
| **Probabilité** | 7 / 10 |
| **Impact** | Moyen — une fonctionnalité non livrée (ex. : tableau de classement, historique des transactions) réduit la complétude démontrée |

**Description**  
L'équipe jongle avec d'autres cours, des emplois ou des imprévus personnels. Si deux membres sont absents simultanément pendant la semaine critique d'un sprint, ou si un seul membre maîtrise une technologie centrale (ex. : configuration des WebSockets), son absence crée un goulot d'étranglement qui arrête tout.

**Signal d'alerte**  
Un membre signale une indisponibilité de plus de 3 jours en plein sprint, ou une tâche critique reste sans assignataire après le stand-up.

**Mesure d'atténuation**  
Chaque fonctionnalité critique est développée en binôme pour qu'au moins deux personnes comprennent le code. Le backlog est priorisé strictement : les fonctionnalités du MVP sont verrouillées en sprint 1 et 2 ; les extras (animations, statistiques avancées) sont placés en sprint 3 et peuvent être coupés sans impacter la note. Si un membre est durablement indisponible, les tâches sont redistribuées lors du prochain stand-up.

---

## 3. Tableau Récapitulatif

| # | Risque | Probabilité | Impact | Priorité |
|---|---|---|---|---|
| 1 | Désynchronisation communication | 7 / 10 | Élevé | Critique |
| 2 | Remise en retard | 7 / 10 | Moyen-Élevé | Haute |
| 3 | Résultat final non conforme aux attentes | 5 / 10 | Élevé | Haute |
| 4 | Intégration IA imprévisible | 8 / 10 | Élevé | Critique |
| 5 | Manque de ressources | 7 / 10 | Moyen | Haute |

---

## 4. Suivi du Projet
Ce document sera mis à jour à chaque sprint d'équipe sur GitHub. Si Daniel ou Raphael constatent des ralentissements ou des bugs majeurs lors des tests d'intégration entre les sockets et la base de données, la probabilité du risque technique sera réévaluée lors du point hebdomadaire.
