# Récits par épique

## Comptes

1. En tant qu'utilisateur, je veux me connecter à mon compte, afin d'accéder à mes données personnelles.
    - Une fois connecté, l'utilisateur est redirigé vers son tableau de bord.
    - Avec un mot de passe incorrect, un message d'erreur générique s'affiche sans révéler si c'est le courriel ou le mot de passe qui est fautif.

2. En tant qu'utilisateur, je veux créer un compte, afin de pouvoir accéder au produit avec une identité qui m'appartient.
    - Un même courriel ne peut être utilisé deux fois pour créer un compte.
    - Le nom d'utilisateur doit être unique.
    - Le mot de passe doit respecter les règles (ex. min. 8 caractères, dont un caractère spécial) sinon le formulaire refuse la soumission et indique pourquoi.
    - Une fois le compte créé, le joueur est automatiquement connecté et redirigé vers son tableau de bord.

3. En tant qu'utilisateur connecté, je veux pouvoir me déconnecter, afin de pouvoir me connecter à un autre compte ou d'en créer un nouveau.
    - Une fois déconnecté, le joueur est redirigé vers la page de connexion.

4. En tant qu'utilisateur, je veux pouvoir modifier mon mot de passe si ce dernier est oublié.
    - Un lien est envoyé à l'adresse courriel de l'utilisateur afin qu'il puisse modifier son mot de passe.

5. En tant qu'utilisateur connecté, je veux pouvoir changer mon mot de passe, afin de garder mon profil sécurisé.
    - Le mot de passe actuel doit être fourni pour être changé.
    - Le nouveau mot de passe doit respecter les règles (ex. min. 8 caractères, dont un caractère spécial), sinon le changement du mot de passe est refusé.
    - Une fois le mot de passe changé, le joueur est redirigé à la page de connexion et l'ancien mot de passe ne fonctionne plus si on essaie de se connecter avec celui-ci.
    
6. En tant qu'utilisateur connecté, je veux pouvoir changer mon nom d'utilisateur, afin de garder mon profil à jour.
    - Le nom d'utilisateur doit être différent de l'ancien.
    - Le nouveau nom d'utilisateur doit être unique.

## Portefeuille

7. En tant qu'utilisateur connecté, je veux que mon solde soit tout le temps visible, afin de savoir combien d'argent il me reste en tout temps.
    - Le solde ne peut pas être négatif.
    - Le solde doit être mis à jour en temps réel à chaque fois que ce dernier est susceptible à des modifications. (Ajouts, pertes, retraits, etc...)

8. En tant qu'utilisateur connecté, je veux pouvoir consulter mon historique de transactions, afin de garder conscience de mes pertes et de mes gains.
    - Chaque mise, gain, retrait et dépôt sont ajouté à l'historique en temps réel.
    - Un nombre affichant le total de l'argent gagné ou perdu se retrouve en haut de l'historique.

9. En tant qu'utilisateur connecté, je veux pouvoir retirer et ajouter de l'argent, afin de gérer mon solde disponible pour jouer.
    - Le montant d'argent à retirer ne peut être supérieur au solde de l'utilisateur.
    - Le montant d'argent à ajouter ou retirer ne peut être inférieur ou égal à zéro.

## Jeu responsable

10. En tant qu'utilisateur connecté, je veux pouvoir me bannir et me bloquer l'accès de l'application, afin de m'empêcher de jouer si ma situation est devenu critique.
    - Une fois banni, le joueur ne peut se débannir et l'accès à l'application lui est bloqué.
    - Le joueur peux choisir la quantité de temps qu'il décide de se bannir 

11. En tant qu'utilisateur connecté, je veux pouvoir supprimer mon compte, afin de mettre fin à mon utilisation du produit et de retirer mes données personnelles.
    - Une fois le compte supprimé, le joueur ne peut se reconnecter avec les informations de son compte supprimé.

## Salons

12. En tant qu'utilisateur, je veux voir les salons actifs depuis la page d'accueil, afin de me joindre à une partie en cours.
    - Tout les salons actifs sont listés sur la page d'accueil.
    - La liste des salons actifs est mis à jour en temps réel.
    - Le nombre de places libres sur chaque salon est affiché.

13. En tant qu'utilisateur connecté, je veux entrer dans un salon en tant que spectateur, afin de regarder la partie en cours, qu'elle soit complète ou non.
    - Le salon est rejoint en cliquant dessus.
    - Un message est affiché lorsque l'utilisateur rejoins un salon complet.
    
14. En tant que spectateur, je veux pouvoir passer de spectateur à joueur, afin de commencer à jouer.
    - Le spectateur souhaitant joué doit avoir un compte et être connecté.
    - Le spectateur souhaitant joué doit avoir un solde positif pour pouvoir miser et jouer.
    - Si deux joueurs souhaitent se joindre à la table en meme temps, un est choisi de façon aléatoire et l'autre recois une alerte que la table est complete et il reste spectateur

15. En tant que joueur, je veux pouvoir quitter la table (salon) où je me trouve, afin de récupérer mon solde restant et retourner à la page d'accueil.
    - Un message de confirmation est affiché si le joueur souhaite quitter la table intentionnellement durant une main.
    - Dans ce cas-là, la mise du joueur est perdue.
    - Si le joueur est déconnecté de façon involontaire pendant une main active, la mise est perdue de la même façon qu'un départ volontaire.
    - Si aucune mise n'est en cours, le joueur quitte immédiatement sans confirmation ni pénalité.

## Blackjack

16. En tant que joueur, je veux pouvoir miser une partie ou la totalité mon argent sur une main, afin de participer à la partie en cours.
    - La mise ne peut être supérieur au solde du joueur.
    - La mise ne peut être négative ou zéro.
    - Une fois que le joueur n'a plus d'argent, l'option pour miser est désactiver.
    - Le joueur doit placer sa mise dans les [X secondes] suivant le début de la période de mise; sinon, il est automatiquement mis en mode spectateur pour cette main.

17. En tant que joueur, je veux pouvoir faire les actions de base du BlackJack (hit, stand, double, split), afin de tenter de battre la main du dealer et de faire le plus d'argent possible dans le processus.
    - Le joueur ne peut pas double ou split si son solde est inférieur à sa mise.
    - Une fois que tous les joueurs de la table ont terminé leur main (stand, bust, ou blackjack), le dealer révèle sa carte cachée et tire des cartes jusqu'à atteindre au moins 17.
    - Une fois la main fini et gagné, le gain en argent s'affiche. 
    - Si le joueur dépasse 21, la main se termine immédiatement et la perte est indiquée clairement.
    - En cas d'égalité avec le dealer, la mise est remboursée et le résultat est affiché comme "égalité".
    - Un blackjack naturel (21 avec les 2 premières cartes) est identifié distinctement d'un 21 obtenu autrement.

18. En tant que joueur, je veux voir les cartes distribuées (les miennes, celles du dealer, celles des autres joueurs), afin de savoir quoi faire comme action.
    - Les deux premières cartes du joueur sont visibles dès la distribution.
    - Une seule carte du dealer est visible tant que tous les joueurs n'ont pas terminé leur main; la deuxième reste cachée.
    - Les cartes des autres joueurs à la table sont visibles par tous.
    - Chaque carte tirée (hit) apparaît en temps réel chez tous les joueurs de la table.

19. En tant que joueur, je veux pouvoir communiquer avec les autres joueurs et le dealer de ma table à travers un salon de discussion, afin d'échanger pendant la partie.
    - Les messages apparaissent en temps réel chez les autres utilisateurs.
    
## Dealer

20. En tant que dealer, je veux pouvoir créer un salon, afin d'accueillir des joueurs et animer une partie.
    - Une fois le salon créé, il s'affiche dans la liste des salons sur la page d'accueil.
    - Les utilisateurs peuvent rejoindre la partie créé.
    - Un dealer ne peut créer un salon si ce dernier possède déjà un autre salon en cours.

21. En tant que dealer, je veux pouvoir mettre fin au salon, afin de terminer la partie que j'anime.
    - Une fois le salon fini, il disparaît de la liste des salons sur la page d'accueil.
    - Les utilisateurs connectés au salon fini sont redirigés vers la page d'accueil.
    - Le dealer peut mettre fin au salon seulement si aucune main est en cours.
    - Un avertissement s'affiche au moins cinq minutes avant la fin du salon.

# Liste des épiques

| Épique | Ce qu'elle couvre |
|---|---|
| Comptes | Création de compte, connexion/déconnexion, gestion des identifiants (mot de passe, nom d'utilisateur, récupération). |
| Portefeuille | Solde du joueur, dépôts et retraits, historique des transactions. |
| Salons | Découverte des tables actives, entrée comme spectateur, passage de spectateur à joueur, sortie de table. |
| Blackjack | Déroulement d'une partie : mise, actions de jeu, tour du dealer, résultats, chat. |
| Jeu responsable | Auto-exclusion temporaire, suppression de compte. |

# Liste ordonnée des récits

| # | Récit | Épique | Points | Sprint |
|---|---|---|---|---|
| 1 | Créer un compte | Comptes | 5 | 1 |
| 2 | Se connecter | Comptes | 3 | 1 |
| 3 | Se déconnecter | Comptes | 1 | 1 |
| 4 | Voir mon solde en tout temps | Portefeuille | 3 | 1 |
| 5 | Voir les salons actifs depuis la page d'accueil | Salons | 3 | 1 |
| 6 | Entrer dans un salon en tant que spectateur | Salons | 3 | 1 |
| 7 | Passer de spectateur à joueur | Salons | 5 | 1 |
| 8 | Miser sur une main | Blackjack | 5 | 1 |
| 9 | Voir les cartes distribuées | Blackjack | 5 | 2 |
| 10 | Faire les actions de base (hit, stand, double, split) | Blackjack | 13 | 2 |
| 11 | Quitter la table | Blackjack | 3 | 2 |
| 12 | Consulter mon historique de transactions | Portefeuille | 5 | 2 |
| 13 | Retirer et ajouter de l'argent | Portefeuille | 5 | 2 |
| 14 | Réinitialiser mon mot de passe oublié | Comptes | 3 | 3 |
| 15 | Changer mon mot de passe | Comptes | 2 | 3 |
| 16 | Changer mon nom d'utilisateur | Comptes | 2 | 3 |
| 17 | Communiquer via le salon de discussion | Blackjack | 5 | 3 |
| 18 | M'auto-exclure temporairement | Jeu responsable | 5 | 3 |
| 19 | Supprimer mon compte | Jeu responsable | 3 | 3 |