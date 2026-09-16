## Le problème 
Notre application permet à des amateurs de jeux d'argent de s'amuser en ligne. Notre application permet aussi à des amis de jouer ensemble autour d'un jeu de hasard.

## Personne utilisatrice
Notre application est exclusive aux personnes majeures, donc âgées d'au moins 18 ans. Notre application possède un compte utilisateur classique qui permet aux clients de jouer sur des tables d'argent. Un autre utilisateur peut très bien ne pas se créer de compte et accéder aux tables comme spectateur, mais il ne possède pas la possibilité de jouer de l'argent. Les croupiers de l'application possèdent pour eux un compte spécial où ils peuvent gérer les parties.

## La proposition en une phrase
Notre applications est une plaforme de jeux d'argents en ligne.


## In scope
| Fonctionnalité | Description |
| :--- | :--- |
| **Création de comptes** | Gestion de deux types de comptes (compte croupier/dealer et compte utilisateur connecté). |
| **Mode invité** | Possibilité d'utiliser l'application de manière limitée, sans création de compte. |
| **Jeu en ligne** | Possibilité de rejoindre et de jouer sur une table depuis l'application. |
| **Statistiques en temps réel** | Calcul en temps réel des probabilités de victoire. |
| **Multijoueur** | Prise en charge de plusieurs joueurs simultanément sur une même table. |
| **Chat en direct** | Flux de discussion textuel pour communiquer directement avec le croupier. |
| **Streaming vidéo** | Flux vidéo en direct pour visionner la table et le déroulement de la partie de jeu d'argent. |


## Out scope
| Fonctionnalité | Limite / Description |
| :--- | :--- |
| **Transactions** | Aucun argent réel ne sera introduit dans l'application. |
| **Application Mobile** | Aucune application mobile n'est prévue pour le moment. |

## Respect des exigences

Notre application a pour objectif de respecter toutes ces exigences :

| ID | Description détaillée |
| :--- | :--- |
| **1** | Une application web client-serveur, bâtie sur un cadriciel full stack capable de faire du rendu côté serveur et côté client. C'est à dire que notre serveur envois la partie au client. Le client vas envoyer des updates de la partie a chaque actions fait par les joueurs.  |
| **2** | Une base de données transactionnelle : elle doit vous permettre de traiter correctement des écritures simultanées. La base de données en NoSQL vas être capable enregistré la partie de manière dynamique et ne vas pas nuire a la partie en ligne |
| **3** | L'application s'installe et démarre à l'aide de Docker, sans que j'aie à installer quoi que ce soit d'autre sur ma machine. L'application vas utiliser Docker pour tester notre application sur un environnement réelle.  |
| **4** | Au moins deux rôles d'utilisateur aux permissions réellement différentes, derrière une authentification. Notre application vas possédée deux type de compte le compte client et un compte dealer capable de crée des parties. |
| **5** | Au moins une fonctionnalité temps réel multi-utilisateurs qui a du sens dans le projet. La vidéo en direct et le salon de discutions en direct. Chaque partie de blackjack vas se jouer en tant réel. |
| **6** | Au moins un point de concurrence réel : deux personnes qui agissent en même temps sur la même ressource, et le résultat reste correct. Par exemple, lorsque deux joueurs veulent rentrer dans une parti, mais qui reste une place, seulement un joueur au hasard sera choisi|
| **7** | Des tests automatisés exécutés automatiquement à chaque poussée vers le dépôt. Le github vas possédée des tests pour assurer un standart de qualité. |
| **8** | La version finale est déployée sur un serveur, accessible autrement que depuis vos portables. L'application a pour objectif d'être depuis n'importe lequel ordinateur. |
