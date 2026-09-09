# Conception


# Route

## Authentification
   * accéder a son compte <br>
    * POST /login
* créer un compte <br>

    * POST /createAcount

* Deconnecter <br>
    * Get /logOut

## Compte
   * modifer le mot passe<br>
    * PATCH /chMdp

    * modifier le userName <br>

    * PATCH /chUserName 

    * Voir le sold<br>

    * GET /sold

   *  Voir les historique <br>

    * GET /hist

    * banissement <br>

    * PATCH /ban

    * supprimer le compte <br>

    * DELETE /supCompte

## Blackjack (en jeux)

    * Voir les salons de joueur <br>
      * GET /salon

   *  rejoin une partie  <br>

    * POST /join

   * Modification de role <br>

    * POST /{id}/chrole



















