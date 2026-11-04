const { valeurMain } = require('./reglementSalon');

// Logique pure de la table réelle : transforme les mains lues par la caméra
// (Reconnaissance des cartes/detection.py) en état affichable par siège.

// Zones de la table en coordonnées normalisées (0 à 1) de l'image de la caméra :
// le croupier est en haut, les sièges 0 à 5 se partagent le bas de gauche à droite.
const LIMITE_CROUPIER_Y = 0.4;
const NB_SIEGES = 6;
const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const NB_MAINS_MAX = 20;

function valeurCarte(rang) {
    if (rang === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rang)) return 10;
    return Number(rang);
}

function estCoordonnee(valeur) {
    return typeof valeur === 'number' && valeur >= 0 && valeur <= 1;
}

// Valide le message de la caméra. Sortie : liste de mains propres, ou null si le message est invalide.
function lireMains(brut) {
    if (!Array.isArray(brut) || brut.length > NB_MAINS_MAX) return null;
    const mains = [];
    for (const main of brut) {
        if (!main || !Array.isArray(main.cartes) || !Array.isArray(main.position)) return null;
        // detection.py peut lire l'as comme "1"
        const cartes = main.cartes.map((rang) => (rang === '1' ? 'A' : rang));
        const [x, y] = main.position;
        if (!cartes.every((rang) => RANGS.includes(rang)) || !estCoordonnee(x) || !estCoordonnee(y)) return null;
        const nbDetectees = Number.isInteger(main.nb_cartes_detectees) ? main.nb_cartes_detectees : cartes.length;
        mains.push({ cartes, nbDetectees: Math.max(nbDetectees, cartes.length), position: [x, y] });
    }
    return mains;
}

// Entrée : position [x, y] normalisée; sortie : index du siège, ou null pour la zone du croupier.
function siegeDeLaPosition([x, y]) {
    if (y < LIMITE_CROUPIER_Y) return null;
    return Math.min(NB_SIEGES - 1, Math.floor(x * NB_SIEGES));
}

function decrireMain(main) {
    const cartes = main.cartes.map((rang) => ({ rang }));
    const total = valeurMain(cartes);
    const totalDur = main.cartes.reduce((somme, rang) => somme + (rang === 'A' ? 1 : valeurCarte(rang)), 0);
    const complete = main.nbDetectees === main.cartes.length;
    const blackjack = cartes.length === 2 && total === 21;
    const bust = total > 21;

    // Tant qu'une carte n'est pas encore reconnue, on ne propose aucune action
    const actions = [];
    if (complete && cartes.length >= 2 && !bust && total < 21) {
        actions.push('hit', 'stand');
        if (cartes.length === 2) {
            actions.push('double');
            if (valeurCarte(main.cartes[0]) === valeurCarte(main.cartes[1])) actions.push('split');
        }
    }

    return {
        cartes,
        total,
        soft: total !== totalDur,
        complete,
        nbCartesDetectees: main.nbDetectees,
        blackjack,
        bust,
        actions,
        position: main.position,
    };
}

// Entrée : mains validées par lireMains; sortie : { croupier: [main], sieges: [{ seat_index, mains }] }.
function etatTable(mains) {
    const croupier = [];
    const parSiege = new Map();
    const triees = [...mains].sort((a, b) => a.position[0] - b.position[0]);
    for (const main of triees) {
        const siege = siegeDeLaPosition(main.position);
        const description = decrireMain(main);
        if (siege === null) croupier.push(description);
        else parSiege.set(siege, [...(parSiege.get(siege) ?? []), description]);
    }
    const sieges = [...parSiege.entries()]
        .sort(([a], [b]) => a - b)
        .map(([seat_index, mainsSiege]) => ({ seat_index, mains: mainsSiege }));
    return { croupier, sieges };
}

module.exports = { lireMains, etatTable, siegeDeLaPosition, LIMITE_CROUPIER_Y, NB_SIEGES };
