// Rôle d'une connexion Socket.IO dans un salon, et ce que chaque rôle reçoit.
// Le rôle est toujours calculé ici, à partir du token vérifié : jamais envoyé par le client.
// Les cartes viennent de la caméra (la carte cachée du croupier est face cachée sur la vraie table) :
// il n'y a rien à masquer dans les mains, seulement les id de comptes pour les spectateurs.

function memeId(premier, second) {
    return premier != null && second != null && String(premier) === String(second);
}

/** Entrées : salon et compte décodé du token (null = invité); sortie : "dealer", "joueur" ou "spectateur". */
function roleDansSalon(salon, user) {
    if (!user) return 'spectateur';
    if (memeId(salon.created_by, user.id)) return 'dealer'; // seulement le créateur du salon
    if ((salon.players ?? []).some((player) => memeId(player.id_compte, user.id))) return 'joueur';
    return 'spectateur';
}

/** Entrées : salon (objet) et rôle; sortie : le salon tel que ce rôle le reçoit (sans id de comptes pour un spectateur). */
function vuePourRole(salon, role) {
    if (role !== 'spectateur') return salon;
    const { created_by, ...vue } = salon;
    vue.players = (salon.players ?? []).map(({ id_compte, ...player }) => player);
    return vue;
}

module.exports = { roleDansSalon, vuePourRole };
