const crypto = require('crypto');

// Logique pure du blackjack (aucun accès à la base de données)

const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COULEURS = ['pique', 'coeur', 'carreau', 'trefle'];
const NB_PAQUETS = 6;
const NB_MAINS_MAX = 4;
const CROUPIER_RESTE_A = 17;

function creerSabot() {
    const sabot = [];
    for (let p = 0; p < NB_PAQUETS; p++) {
        for (const couleur of COULEURS) {
            for (const rang of RANGS) {
                sabot.push({ rang, couleur });
            }
        }
    }
    // Mélange de Fisher-Yates avec un générateur cryptographique
    for (let i = sabot.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [sabot[i], sabot[j]] = [sabot[j], sabot[i]];
    }
    return sabot;
}

function valeurCarte(rang) {
    if (rang === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rang)) return 10;
    return Number(rang);
}

// Les as valent 11, puis 1 tant que la main dépasse 21
function valeurMain(cartes) {
    let total = 0;
    let as = 0;
    for (const carte of cartes) {
        total += valeurCarte(carte.rang);
        if (carte.rang === 'A') as++;
    }
    while (total > 21 && as > 0) {
        total -= 10;
        as--;
    }
    return total;
}

function estBlackjackNaturel(cartes) {
    return cartes.length === 2 && valeurMain(cartes) === 21;
}

function arrondir(montant) {
    return Math.round(montant * 100) / 100;
}

function nouvelleMain(cartes, mise, issueDuSplit = false) {
    return { cartes, mise, statut: 'en_cours', issueDuSplit, double: false, resultat: null, gain: 0 };
}

function distribuer(mise) {
    const sabot = creerSabot();
    const main = nouvelleMain([], mise);
    const croupier = [];
    main.cartes.push(sabot.pop());
    croupier.push(sabot.pop());
    main.cartes.push(sabot.pop());
    croupier.push(sabot.pop());

    const partie = { statut: 'en_cours', sabot, croupier, mains: [main], mainActive: 0 };

    // Un blackjack naturel (joueur ou croupier) termine la main immédiatement
    const joueurBJ = estBlackjackNaturel(main.cartes);
    if (joueurBJ || estBlackjackNaturel(croupier)) {
        main.statut = joueurBJ ? 'blackjack' : 'stand';
        terminer(partie);
    }
    return partie;
}

function actionsPossibles(partie, solde) {
    if (partie.statut !== 'en_cours') return [];
    const main = partie.mains[partie.mainActive];
    const actions = ['hit', 'stand'];
    const deuxCartes = main.cartes.length === 2;
    if (deuxCartes && solde >= main.mise) {
        actions.push('double');
        const memeValeur = valeurCarte(main.cartes[0].rang) === valeurCarte(main.cartes[1].rang);
        if (memeValeur && partie.mains.length < NB_MAINS_MAX) actions.push('split');
    }
    return actions;
}

// Applique une action sur la main active. Le débit du solde (double/split) est géré par l'appelant.
function jouer(partie, action) {
    const main = partie.mains[partie.mainActive];

    switch (action) {
        case 'hit':
            main.cartes.push(partie.sabot.pop());
            break;
        case 'stand':
            main.statut = 'stand';
            break;
        case 'double':
            main.mise = arrondir(main.mise * 2);
            main.double = true;
            main.cartes.push(partie.sabot.pop());
            main.statut = valeurMain(main.cartes) > 21 ? 'bust' : 'stand';
            break;
        case 'split': {
            const [premiere, seconde] = main.cartes;
            const autre = nouvelleMain([seconde, partie.sabot.pop()], main.mise, true);
            main.cartes = [premiere, partie.sabot.pop()];
            main.issueDuSplit = true;
            // Des as séparés ne reçoivent qu'une seule carte chacun
            if (premiere.rang === 'A') {
                main.statut = 'stand';
                autre.statut = 'stand';
            }
            partie.mains.splice(partie.mainActive + 1, 0, autre);
            break;
        }
        default:
            throw new Error(`Action inconnue : ${action}`);
    }
    avancer(partie);
}

// Passe à la prochaine main jouable; si aucune, le croupier joue
function avancer(partie) {
    while (partie.mainActive < partie.mains.length) {
        const main = partie.mains[partie.mainActive];
        if (main.statut === 'en_cours') {
            const total = valeurMain(main.cartes);
            if (total > 21) main.statut = 'bust';
            else if (total === 21) main.statut = 'stand';
            else return;
        }
        partie.mainActive++;
    }
    terminer(partie);
}

function terminer(partie) {
    // Le croupier ne tire que si au moins une main attend la comparaison
    if (partie.mains.some((main) => main.statut === 'stand')) {
        while (valeurMain(partie.croupier) < CROUPIER_RESTE_A) {
            partie.croupier.push(partie.sabot.pop());
        }
    }

    const totalCroupier = valeurMain(partie.croupier);
    const croupierBJ = estBlackjackNaturel(partie.croupier);

    for (const main of partie.mains) {
        const total = valeurMain(main.cartes);
        let resultat;
        let gain;
        if (main.statut === 'bust') {
            resultat = 'perdu'; gain = 0;
        } else if (main.statut === 'blackjack') {
            if (croupierBJ) { resultat = 'egalite'; gain = main.mise; }
            else { resultat = 'blackjack'; gain = main.mise * 2.5; } // paie 3:2
        } else if (croupierBJ) {
            resultat = 'perdu'; gain = 0;
        } else if (totalCroupier > 21 || total > totalCroupier) {
            resultat = 'gagne'; gain = main.mise * 2;
        } else if (total === totalCroupier) {
            resultat = 'egalite'; gain = main.mise;
        } else {
            resultat = 'perdu'; gain = 0;
        }
        main.resultat = resultat;
        main.gain = arrondir(gain);
    }
    partie.statut = 'terminee';
}

// Ce que le client a le droit de voir : pas de sabot, carte cachée du croupier pendant la main
function vuePartie(partie, solde) {
    const enCours = partie.statut === 'en_cours';
    const croupier = enCours ? [partie.croupier[0], { cachee: true }] : partie.croupier;
    return {
        statut: partie.statut,
        croupier: {
            cartes: croupier,
            total: valeurMain(enCours ? [partie.croupier[0]] : partie.croupier),
            blackjack: !enCours && estBlackjackNaturel(partie.croupier),
        },
        mains: partie.mains.map((main) => ({
            cartes: main.cartes,
            total: valeurMain(main.cartes),
            mise: main.mise,
            statut: main.statut,
            double: main.double,
            resultat: main.resultat,
            gain: main.gain,
        })),
        mainActive: enCours ? partie.mainActive : null,
        actions: actionsPossibles(partie, solde),
    };
}

module.exports = { distribuer, jouer, actionsPossibles, vuePartie, valeurMain, arrondir };
