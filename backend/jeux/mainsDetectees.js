// Applique au salon les mains vues par la caméra (service de détection).
// Siège 0 = vraie gauche du dealer = première main de mains.joueurs.

/** Entrée : rangs détectés (["K", "7"]); sortie : cartes du salon ([{ rang: "K" }, { rang: "7" }]). */
function versCartes(rangs) {
    if (!Array.isArray(rangs)) return [];
    return rangs.map((rang) => ({ rang }));
}

/** Entrées : salon (document Mongoose) et mains { croupier, joueurs }; modifie dealer_hand et players[].hands. */
function attribuerMains(salon, mains) {
    // Toujours réassigner le tableau complet : Mongoose ne voit pas les changements à l'intérieur d'un Array sans type
    salon.dealer_hand = versCartes(mains?.croupier?.cartes);

    // Seulement les joueurs qui ont misé, du siège 0 (vraie gauche du dealer) vers sa droite.
    // filter fait une copie : salon.players garde son ordre, mais les objets joueurs sont les mêmes.
    const joueurs = salon.players
        .filter((player) => Number(player.bet) > 0)
        .sort((a, b) => a.seat_index - b.seat_index);

    // On parcourt les joueurs : les mains détectées en trop sont ignorées (split pas encore géré)
    joueurs.forEach((player, i) => {
        const mainDetectee = mains?.joueurs?.[i];
        player.hands = [{ cartes: versCartes(mainDetectee?.cartes), mise: player.bet }];
    });
}

module.exports = { attribuerMains, versCartes };