const crypto = require('crypto');

// Logique pure du blackjack (aucun accès à la base de données)

const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COULEURS = ['pique', 'coeur', 'carreau', 'trefle'];
const NB_PAQUETS = 6;
const NB_PLACES_MAX = 3; // mains jouées en même temps (places à la table)
const NB_MAINS_MAX = 4; // par place, en comptant les splits
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

function nouvelleMain(cartes, mise, place, issueDuSplit = false) {
    return { cartes, mise, place, statut: 'en_cours', issueDuSplit, double: false, resultat: null, gain: 0 };
}

// --- Side bets : réglés dès la distribution, indépendamment de la main principale ---

const SIDE_BETS = ['pairesParfaites', 'vingtEtUnPlusTrois'];

const COULEUR_ROUGE = ['coeur', 'carreau'];

// Paires parfaites : les deux premières cartes du joueur forment une paire
function evaluerPairesParfaites([a, b]) {
    if (a.rang !== b.rang) return null;
    if (a.couleur === b.couleur) return { combinaison: 'Paire parfaite', paiement: 25 };
    if (COULEUR_ROUGE.includes(a.couleur) === COULEUR_ROUGE.includes(b.couleur)) {
        return { combinaison: 'Paire de couleur', paiement: 12 };
    }
    return { combinaison: 'Paire mixte', paiement: 6 };
}

// L'as peut être bas (A-2-3) ou haut (Q-K-A)
function estSuite(cartes) {
    const positions = cartes.map((carte) => RANGS.indexOf(carte.rang) + 1).sort((x, y) => x - y);
    const consecutives = (liste) => liste[1] === liste[0] + 1 && liste[2] === liste[1] + 1;
    if (consecutives(positions)) return true;
    if (positions[0] === 1) return consecutives([...positions.slice(1), 14]);
    return false;
}

// 21+3 : les deux premières cartes du joueur + la carte visible du croupier forment une main de poker
function evaluerVingtEtUnPlusTrois(cartes) {
    const couleur = cartes.every((carte) => carte.couleur === cartes[0].couleur);
    const brelan = cartes.every((carte) => carte.rang === cartes[0].rang);
    const suite = estSuite(cartes);
    if (brelan && couleur) return { combinaison: 'Brelan assorti', paiement: 100 };
    if (suite && couleur) return { combinaison: 'Quinte flush', paiement: 40 };
    if (brelan) return { combinaison: 'Brelan', paiement: 30 };
    if (suite) return { combinaison: 'Suite', paiement: 10 };
    if (couleur) return { combinaison: 'Couleur', paiement: 5 };
    return null;
}

function reglerSideBets(sideBets, main, croupier) {
    return SIDE_BETS
        .filter((type) => sideBets[type] > 0)
        .map((type) => {
            const mise = sideBets[type];
            const issue = type === 'pairesParfaites'
                ? evaluerPairesParfaites(main.cartes)
                : evaluerVingtEtUnPlusTrois([...main.cartes, croupier[0]]);
            return {
                type,
                place: main.place,
                mise,
                combinaison: issue?.combinaison ?? null,
                paiement: issue?.paiement ?? 0,
                // Le gain inclut la mise rendue
                gain: issue ? arrondir(mise * (issue.paiement + 1)) : 0,
            };
        });
}

// places : [{ mise, sideBets }], une entrée par main jouée (de gauche à droite)
function distribuer(places) {
    const sabot = creerSabot();
    const mains = places.map(({ mise }, place) => nouvelleMain([], mise, place));
    const croupier = [];
    // Une carte à chaque place puis au croupier, deux fois
    for (let tour = 0; tour < 2; tour++) {
        for (const main of mains) main.cartes.push(sabot.pop());
        croupier.push(sabot.pop());
    }

    const partie = {
        statut: 'en_cours',
        sabot,
        croupier,
        mains,
        mainActive: 0,
        sideBets: mains.flatMap((main) => reglerSideBets(places[main.place].sideBets ?? {}, main, croupier)),
    };

    for (const main of mains) {
        if (estBlackjackNaturel(main.cartes)) main.statut = 'blackjack';
    }
    // Blackjack du croupier : toutes les mains sont réglées immédiatement
    if (estBlackjackNaturel(croupier)) {
        for (const main of mains) {
            if (main.statut === 'en_cours') main.statut = 'stand';
        }
        terminer(partie);
        return partie;
    }
    // Saute les mains déjà blackjack; termine si aucune n'est jouable
    avancer(partie);
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
        const mainsDeLaPlace = partie.mains.filter((m) => (m.place ?? 0) === (main.place ?? 0)).length;
        if (memeValeur && mainsDeLaPlace < NB_MAINS_MAX) actions.push('split');
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
            const autre = nouvelleMain([seconde, partie.sabot.pop()], main.mise, main.place ?? 0, true);
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
            place: main.place ?? 0,
            statut: main.statut,
            double: main.double,
            resultat: main.resultat,
            gain: main.gain,
        })),
        mainActive: enCours ? partie.mainActive : null,
        actions: actionsPossibles(partie, solde),
        sideBets: (partie.sideBets ?? []).map(({ type, place, mise, combinaison, paiement, gain }) => ({
            type, place: place ?? 0, mise, combinaison, paiement, gain,
        })),
    };
}

module.exports = { distribuer, jouer, actionsPossibles, vuePartie, valeurMain, arrondir, SIDE_BETS, NB_PLACES_MAX };
