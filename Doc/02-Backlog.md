## Authentification

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

## Compte

4. En tant qu'utilisateur connecté, je veux pouvoir changer mon mot de passe, afin de garder mon profil sécurisé.
    - Le mot de passe actuel doit être fourni pour être changé.
    - Le nouveau mot de passe doit respecter les règles (ex. min. 8 caractères, dont un caractère spécial), sinon le changement du mot de passe est refusé.
    - Une fois le mot de passe changé, le joueur est redirigé à la page de connexion et l'ancien mot de passe ne fonctionne plus si on essaie de se connecter avec celui-ci.

5. En tant qu'utilisateur connecté, je veux pouvoir changer mon nom d'utilisateur, afin de garder mon profil à jour.
    - Le nom d'utilisateur doit être différent de l'ancien.
    - Le nouveau nom d'utilisateur doit être unique.

6. En tant qu'utilisateur connecté, je veux que mon solde soit tout le temps visible, afin de savoir combien d'argent il me reste en tout temps.
    - Le solde ne peut pas être négatif.
    - Le solde doit être mis à jour en temps réel à chaque fois que ce dernier est susceptible à des modifications. (Ajouts, pertes, retraits, etc...)

7. En tant qu'utilisateur connecté, je veux pouvoir consulter mon historique de transactions, afin de garder conscience de mes pertes et de mes gains.
    - Chaque mise, gain, retrait et dépôt sont ajouté à l'historique en temps réel.
    - Un nombre affichant le total de l'argent gagné ou perdu se retrouve en haut de l'historique.

8. En tant qu'utilisateur connecté, je veux pouvoir me bannir et me bloquer l'accès de l'application, afin de m'empêcher de jouer si ma situation est devenu critique.
    - Une fois banni, le joueur ne peut se débannir et l'accès à l'application lui est bloqué.

9. En tant qu'utilisateur connecté, je veux pouvoir supprimer mon compte, afin de mettre fin à mon utilisation du produit et de retirer mes données personnelles.
    - Une fois le compte supprimé, le joueur ne peut se reconnecter avec les informations de son compte supprimé.

10. Argent

## Blackjack

11. En tant qu'utilisateur, je veux voir les salons actifs depuis la page d'accueil, afin de me joindre à une partie en cours.
    - Tout les salons actifs sont listés sur la page d'accueil.
    - La liste des salons actifs est mis à jour en temps réel.
    - Le nombre de places libres sur chaque salon est affiché.

12. En tant qu'utilisateur connecté, je veux entrer dans un salon en tant que spectateur, afin de regarder la partie en cours, qu'elle soit complète ou non.
    - Le salon est rejoint en cliquant dessus.
    - Un message est affiché lorsque l'utilisateur rejoins un salon complet.
    

13. En tant que spectateur, je veux pouvoir passer de spectateur à joueur, afin de commencer à jouer.
    - Le spectateur souhaitant joué doit avoir un compte et être connecté.
    - Le spectateur souhaitant joué doit avoir un solde positif pour pouvoir miser et jouer.





