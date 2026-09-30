const {
    valeurMain, valeurCarte, estBlackjackNaturel, arrondir, reglerSideBets, SIDE_BETS, NB_MAINS_MAX, CROUPIER_RESTE_A,
} = require('./blackjack');

// Logique pure de la table live : un croupier humain distribue de vraies cartes,
// la vision (service Python) les reconnaît et cette machine à états applique les règles.
// Aucun accès à la base de données : les mouvements d'argent sont retournés à l'appelant.

const NB_PLACES = 5;
const DUREE_MISES = 15000; // à partir de la première mise
const DUREE_DECISION = 15000;
const DUREE_RESULTATS = 8000;
const VISION_HORS_LIGNE = 5000;
const ALERTES_MAX = 5;

// mises → distribution → decisions → croupier → resultats → nettoyage → mises
const PHASES = ['mises', 'distribution', 'decisions', 'croupier', 'resultats', 'nettoyage'];

function creerTable() {
    return {
        manche: 1,
        phase: 'mises',
        finPhase: null,
        croupier: [],
        places: Array(NB_PLACES).fill(null),
        active: null, // { place, main }
        paye: false,
        aVerser: [], // remboursements en attente (manche annulée)
        alertes: [],
        derniereVision: 0,
        tableVide: true,
    };
}

function cle(carte) {
    return `${carte.rang}-${carte.couleur}`;
}

function compter(cartes) {
    const compte = new Map();
    for (const carte of cartes) compte.set(cle(carte), (compte.get(cle(carte)) ?? 0) + 1);
    return compte;
}

// Cartes détectées qui ne sont pas encore attribuées à la zone (les cartes cachées par une main sont ignorées)
function nouvellesCartes(detectees, attribuees) {
    const deja = compter(attribuees);
    const nouvelles = [];
    for (const carte of detectees) {
        const reste = deja.get(cle(carte)) ?? 0;
        if (reste > 0) deja.set(cle(carte), reste - 1);
        else nouvelles.push({ rang: carte.rang, couleur: carte.couleur });
    }
    return nouvelles;
}

function alerter(table, message, maintenant) {
    if (table.alertes[0]?.message === message) return;
    table.alertes.unshift({ message, a: maintenant });
    table.alertes.length = Math.min(table.alertes.length, ALERTES_MAX);
}

function placesOccupees(table) {
    return table.places.map((place, index) => (place ? index : null)).filter((index) => index !== null);
}

function nouvelleMain(cartes, mise) {
    return { cartes, mise, statut: 'en_cours', double: false, enAttente: false, asSepares: false, resultat: null, gain: 0 };
}

// --- Mises ---

function miser(table, index, joueur, mise, sideBets, maintenant) {
    if (table.phase !== 'mises') return "Les mises sont fermées";
    if (!Number.isInteger(index) || index < 0 || index >= NB_PLACES) return "Place invalide";
    if (table.places[index]) return "Cette place est déjà prise";
    if (table.places.some((place) => place?.id_compte === joueur.id)) return "Vous avez déjà une place à cette table";

    table.places[index] = {
        id_compte: joueur.id,
        nom: joueur.nom,
        mise,
        sideBets,
        mains: [],
        sideBetsResultats: [],
    };
    // Le compte à rebours démarre avec la première mise
    if (table.finPhase === null) table.finPhase = maintenant + DUREE_MISES;
    return null;
}

// Retourne la place libérée (pour rembourser) ou un message d'erreur
function annulerMise(table, idJoueur) {
    if (table.phase !== 'mises') return { erreur: "Les mises sont fermées" };
    const index = table.places.findIndex((place) => place?.id_compte === idJoueur);
    if (index === -1) return { erreur: "Aucune mise à annuler" };
    const place = table.places[index];
    table.places[index] = null;
    if (placesOccupees(table).length === 0) table.finPhase = null;
    return { place };
}

function totalMisePlace(place) {
    return arrondir(place.mise + SIDE_BETS.reduce((total, type) => total + (place.sideBets[type] ?? 0), 0));
}

// --- Distribution : chaque place puis le croupier, deux fois (le croupier n'a qu'une carte visible) ---

function ordreDistribution(table) {
    const occupees = placesOccupees(table);
    return [
        ...occupees.map((index) => ({ zone: index, carte: 0 })),
        { zone: 'croupier', carte: 0 },
        ...occupees.map((index) => ({ zone: index, carte: 1 })),
    ];
}

function nbCartesZone(table, zone) {
    if (zone === 'croupier') return table.croupier.length;
    return table.places[zone].mains.reduce((total, main) => total + main.cartes.length, 0);
}

function cartesZone(table, zone) {
    if (zone === 'croupier') return table.croupier;
    return table.places[zone]?.mains.flatMap((main) => main.cartes) ?? [];
}

// Zone qui doit recevoir la prochaine carte (null si personne n'attend de carte)
function zoneAttendue(table) {
    switch (table.phase) {
        case 'distribution':
            return ordreDistribution(table).find(({ zone, carte }) => nbCartesZone(table, zone) <= carte)?.zone ?? null;
        case 'decisions': {
            const main = mainActive(table);
            return main && besoinCarte(main) ? table.active.place : null;
        }
        case 'croupier':
            return croupierDoitTirer(table) ? 'croupier' : null;
        default:
            return null;
    }
}

function mainActive(table) {
    if (!table.active) return null;
    return table.places[table.active.place]?.mains[table.active.main] ?? null;
}

function besoinCarte(main) {
    return main.cartes.length < 2 || main.enAttente;
}

function fermerMises(table, maintenant) {
    if (placesOccupees(table).length === 0) {
        table.finPhase = null;
        return;
    }
    // Des cartes restées sur la table seraient prises pour la nouvelle donne (vérifiable seulement si la vision est en ligne)
    if (!table.tableVide && visionConnectee(table, maintenant)) {
        table.finPhase = maintenant + 2000;
        alerter(table, "Retirez les cartes de la table pour commencer la manche", maintenant);
        return;
    }
    for (const index of placesOccupees(table)) {
        table.places[index].mains = [nouvelleMain([], table.places[index].mise)];
    }
    table.phase = 'distribution';
    table.finPhase = null;
    alerter(table, `Manche ${table.manche} : mises fermées, distribuez`, maintenant);
}

// Une carte posée dans une zone pendant la distribution
function recevoirCarteDistribution(table, zone, carte) {
    if (zone === 'croupier') {
        if (table.croupier.length >= 1) return false;
        table.croupier.push(carte);
        return true;
    }
    const main = table.places[zone]?.mains[0];
    if (!main || main.cartes.length >= 2) return false;
    main.cartes.push(carte);
    return true;
}

function distributionTerminee(table) {
    return table.croupier.length >= 1
        && placesOccupees(table).every((index) => table.places[index].mains[0].cartes.length >= 2);
}

function commencerDecisions(table, maintenant) {
    for (const index of placesOccupees(table)) {
        const place = table.places[index];
        const main = place.mains[0];
        // Side bets réglés dès que les deux cartes du joueur et la carte du croupier sont connues
        place.sideBetsResultats = reglerSideBets(place.sideBets, main, table.croupier);
        if (estBlackjackNaturel(main.cartes)) main.statut = 'blackjack';
    }
    table.phase = 'decisions';
    table.active = { place: -1, main: 0 };
    avancer(table, maintenant);
}

// --- Décisions des joueurs, place par place de gauche à droite ---

// Place la main active sur la prochaine main jouable; si aucune, c'est au tour du croupier
function avancer(table, maintenant) {
    let { place, main } = table.active;
    if (place === -1) {
        place = 0;
        main = 0;
    }
    while (place < NB_PLACES) {
        const mains = table.places[place]?.mains ?? [];
        while (main < mains.length) {
            const courante = mains[main];
            if (courante.statut === 'en_cours') {
                if (besoinCarte(courante)) {
                    // Le croupier doit donner une carte : le chrono du joueur est suspendu
                    table.active = { place, main };
                    table.finPhase = null;
                    return;
                }
                const total = valeurMain(courante.cartes);
                if (total > 21) courante.statut = 'bust';
                else if (total === 21 || courante.asSepares) courante.statut = 'stand';
                else {
                    table.active = { place, main };
                    table.finPhase = maintenant + DUREE_DECISION;
                    return;
                }
            }
            main++;
        }
        place++;
        main = 0;
    }
    table.active = null;
    table.phase = 'croupier';
    table.finPhase = null;
    if (!croupierDoitTirer(table)) terminerManche(table, maintenant);
}

function actionsPossibles(table, index) {
    if (table.phase !== 'decisions' || table.active?.place !== index) return [];
    const main = mainActive(table);
    if (!main || besoinCarte(main)) return [];
    const actions = ['hit', 'stand'];
    if (main.cartes.length === 2) {
        actions.push('double');
        const memeValeur = valeurCarte(main.cartes[0].rang) === valeurCarte(main.cartes[1].rang);
        if (memeValeur && table.places[index].mains.length < NB_MAINS_MAX) actions.push('split');
    }
    return actions;
}

// Coût supplémentaire (double / split) que l'appelant doit débiter avant d'appeler jouer()
function coutAction(table, action) {
    return action === 'double' || action === 'split' ? mainActive(table).mise : 0;
}

function jouer(table, action, maintenant) {
    const main = mainActive(table);
    const place = table.places[table.active.place];
    switch (action) {
        case 'hit':
            main.enAttente = true;
            break;
        case 'stand':
            main.statut = 'stand';
            break;
        case 'double':
            main.mise = arrondir(main.mise * 2);
            main.double = true;
            main.enAttente = true;
            break;
        case 'split': {
            const [premiere, seconde] = main.cartes;
            const autre = nouvelleMain([seconde], main.mise);
            main.cartes = [premiere];
            // Des as séparés ne reçoivent qu'une seule carte chacun
            main.asSepares = autre.asSepares = premiere.rang === 'A';
            place.mains.splice(table.active.main + 1, 0, autre);
            break;
        }
        default:
            throw new Error(`Action inconnue : ${action}`);
    }
    avancer(table, maintenant);
}

function recevoirCarteDecision(table, zone, carte, maintenant) {
    const main = mainActive(table);
    if (zone !== table.active?.place || !main || !besoinCarte(main)) return false;
    main.cartes.push(carte);
    if (main.enAttente) {
        main.enAttente = false;
        if (main.double) main.statut = valeurMain(main.cartes) > 21 ? 'bust' : 'stand';
    }
    avancer(table, maintenant);
    return true;
}

// --- Croupier : pas de carte cachée (règle européenne), il tire jusqu'à 17 ---

function toutesLesMains(table) {
    return placesOccupees(table).flatMap((index) => table.places[index].mains);
}

function croupierDoitTirer(table) {
    const mains = toutesLesMains(table);
    // Seconde carte nécessaire dès qu'une main n'a pas sauté (un blackjack peut être égalisé)
    if (table.croupier.length < 2) return mains.some((main) => main.statut !== 'bust');
    if (estBlackjackNaturel(table.croupier)) return false;
    return mains.some((main) => main.statut === 'stand') && valeurMain(table.croupier) < CROUPIER_RESTE_A;
}

function recevoirCarteCroupier(table, carte, maintenant) {
    if (!croupierDoitTirer(table)) return false;
    table.croupier.push(carte);
    if (!croupierDoitTirer(table)) terminerManche(table, maintenant);
    return true;
}

// Calcule le résultat de chaque main. Blackjack du croupier : seules les mises initiales sont perdues,
// les doubles et les splits sont remboursés.
function terminerManche(table, maintenant) {
    const totalCroupier = valeurMain(table.croupier);
    const croupierBJ = estBlackjackNaturel(table.croupier);

    for (const index of placesOccupees(table)) {
        const place = table.places[index];
        place.mains.forEach((main, m) => {
            const total = valeurMain(main.cartes);
            let resultat;
            let gain;
            if (main.statut === 'bust') {
                resultat = 'perdu'; gain = 0;
            } else if (main.statut === 'blackjack') {
                if (croupierBJ) { resultat = 'egalite'; gain = main.mise; }
                else { resultat = 'blackjack'; gain = main.mise * 2.5; }
            } else if (croupierBJ) {
                resultat = 'perdu'; gain = main.mise - (m === 0 ? place.mise : 0);
            } else if (totalCroupier > 21 || total > totalCroupier) {
                resultat = 'gagne'; gain = main.mise * 2;
            } else if (total === totalCroupier) {
                resultat = 'egalite'; gain = main.mise;
            } else {
                resultat = 'perdu'; gain = 0;
            }
            main.resultat = resultat;
            main.gain = arrondir(gain);
        });
    }
    table.phase = 'resultats';
    table.active = null;
    table.finPhase = maintenant + DUREE_RESULTATS;
}

// Montants à créditer une seule fois : gains dès que la manche est terminée et remboursements en attente
function paiementsDus(table) {
    const remboursements = table.aVerser ?? [];
    table.aVerser = [];
    if (table.phase !== 'resultats' || table.paye) return remboursements;
    table.paye = true;
    return remboursements.concat(placesOccupees(table).flatMap((index) => {
        const place = table.places[index];
        const mains = arrondir(place.mains.reduce((total, main) => total + main.gain, 0));
        const sideBets = arrondir(place.sideBetsResultats.reduce((total, sb) => total + sb.gain, 0));
        const liste = [];
        if (mains > 0) liste.push({ id_compte: place.id_compte, montant: mains, desc: 'Gain blackjack live' });
        if (sideBets > 0) liste.push({ id_compte: place.id_compte, montant: sideBets, desc: 'Gain side bets blackjack live' });
        return liste;
    }));
}

function nouvelleManche(table) {
    table.manche++;
    table.phase = 'mises';
    table.finPhase = null;
    table.croupier = [];
    table.places = Array(NB_PLACES).fill(null);
    table.active = null;
    table.paye = false;
}

// --- Entrées : vision et temps ---

// zones : { croupier: [cartes], places: [[cartes], ...] } (cartes stables vues par la caméra), vide : table sans carte
function recevoirVision(table, { zones, vide }, maintenant) {
    table.derniereVision = maintenant;
    table.tableVide = vide;

    if (table.phase === 'nettoyage') {
        if (vide) nouvelleManche(table);
        return;
    }
    if (table.phase === 'mises' || table.phase === 'resultats') {
        if (!vide && table.phase === 'mises') alerter(table, "Cartes sur la table pendant les mises : retirez-les", maintenant);
        return;
    }

    const toutes = [['croupier', zones.croupier ?? []], ...(zones.places ?? []).map((cartes, index) => [index, cartes ?? []])];
    for (const [zone, detectees] of toutes) {
        if (zone !== 'croupier' && zone >= NB_PLACES) continue;
        for (const carte of nouvellesCartes(detectees, cartesZone(table, zone))) {
            if (!recevoirCarte(table, zone, carte, maintenant)) {
                const nom = zone === 'croupier' ? 'croupier' : `place ${zone + 1}`;
                alerter(table, `Carte ${carte.rang} ${carte.couleur} inattendue (${nom}) : ignorée`, maintenant);
            }
        }
    }
}

function recevoirCarte(table, zone, carte, maintenant) {
    if (zone !== 'croupier' && !table.places[zone]) return false;
    switch (table.phase) {
        case 'distribution': {
            const ok = recevoirCarteDistribution(table, zone, carte);
            if (ok && distributionTerminee(table)) commencerDecisions(table, maintenant);
            return ok;
        }
        case 'decisions':
            return recevoirCarteDecision(table, zone, carte, maintenant);
        case 'croupier':
            return zone === 'croupier' && recevoirCarteCroupier(table, carte, maintenant);
        default:
            return false;
    }
}

// Avance selon le temps écoulé
function tick(table, maintenant) {
    if (table.finPhase === null || maintenant < table.finPhase) return;
    switch (table.phase) {
        case 'mises':
            fermerMises(table, maintenant);
            break;
        case 'decisions':
            // Temps écoulé : le joueur reste
            jouer(table, 'stand', maintenant);
            break;
        case 'resultats':
            table.phase = 'nettoyage';
            table.finPhase = null;
            break;
        default:
            break;
    }
}

// --- Commandes du croupier ---

// Carte saisie à la main (carte illisible ou vision hors ligne), donnée à la zone qui attend une carte
function carteManuelle(table, carte, maintenant) {
    const zone = zoneAttendue(table);
    if (zone === null) return "Aucune zone n'attend de carte";
    recevoirCarte(table, zone, carte, maintenant);
    const nom = zone === 'croupier' ? 'croupier' : `place ${zone + 1}`;
    alerter(table, `Carte ${carte.rang} ${carte.couleur} saisie à la main (${nom})`, maintenant);
    return null;
}

function fermerMisesMaintenant(table, maintenant) {
    if (table.phase !== 'mises') return "Les mises sont déjà fermées";
    if (placesOccupees(table).length === 0) return "Aucune mise sur la table";
    table.finPhase = maintenant;
    return null;
}

// Fausse donne : toutes les mises de la manche (doubles, splits et side bets compris) sont rendues
// par paiementsDus(). Retourne un message d'erreur ou null.
function annulerManche(table, maintenant) {
    if (['resultats', 'nettoyage'].includes(table.phase)) return "La manche est déjà terminée";
    if (placesOccupees(table).length === 0) return "Aucune mise à rembourser";

    const remboursements = placesOccupees(table).map((index) => {
        const place = table.places[index];
        const mains = place.mains.length > 0 ? place.mains.reduce((total, main) => total + main.mise, 0) : place.mise;
        const sideBets = SIDE_BETS.reduce((total, type) => total + (place.sideBets[type] ?? 0), 0);
        return { id_compte: place.id_compte, montant: arrondir(mains + sideBets), desc: 'Remboursement manche live annulée' };
    });

    if (table.phase === 'mises') {
        table.places = Array(NB_PLACES).fill(null);
        table.finPhase = null;
    } else {
        table.phase = 'nettoyage';
        table.active = null;
        table.finPhase = null;
        table.paye = true; // aucun gain à verser pour cette manche
    }
    table.aVerser = (table.aVerser ?? []).concat(remboursements);
    alerter(table, `Manche ${table.manche} annulée par le croupier : mises remboursées`, maintenant);
    return null;
}

// Le croupier confirme avoir ramassé les cartes quand la caméra ne peut pas le voir
function confirmerTableVide(table) {
    if (table.phase !== 'nettoyage') return "Il n'y a rien à ramasser pour le moment";
    nouvelleManche(table);
    return null;
}

// --- Vues ---

function visionConnectee(table, maintenant) {
    return maintenant - table.derniereVision < VISION_HORS_LIGNE;
}

function instructionCroupier(table) {
    const zone = zoneAttendue(table);
    const nomZone = zone === 'croupier' ? 'le croupier' : `la place ${zone + 1}`;
    switch (table.phase) {
        case 'mises':
            return table.finPhase ? "Faites vos jeux : ne distribuez pas encore" : "En attente des joueurs";
        case 'distribution':
            return `Distribuez une carte pour ${nomZone}`;
        case 'decisions':
            return zone !== null ? `Donnez une carte à la place ${zone + 1}` : `La place ${table.active.place + 1} décide…`;
        case 'croupier':
            return `Croupier à ${valeurMain(table.croupier)} : TIREZ une carte`;
        case 'resultats':
            return `Croupier ${estBlackjackNaturel(table.croupier) ? 'blackjack' : valeurMain(table.croupier)} : paiement des gains`;
        case 'nettoyage':
            return "Ramassez toutes les cartes pour la prochaine manche";
        default:
            return '';
    }
}

function vueMain(main) {
    return {
        cartes: main.cartes,
        total: valeurMain(main.cartes),
        mise: main.mise,
        statut: main.statut,
        double: main.double,
        enAttente: besoinCarte(main) && main.statut === 'en_cours',
        resultat: main.resultat,
        gain: main.gain,
    };
}

// Ce que voient les joueurs (idJoueur optionnel) et la vision (sans idJoueur)
function vueTable(table, maintenant, idJoueur = null) {
    const maPlace = idJoueur ? table.places.findIndex((place) => place?.id_compte === idJoueur) : -1;
    return {
        manche: table.manche,
        phase: table.phase,
        restantMs: table.finPhase ? Math.max(table.finPhase - maintenant, 0) : null,
        nbPlaces: NB_PLACES,
        croupier: {
            cartes: table.croupier,
            total: valeurMain(table.croupier),
            blackjack: estBlackjackNaturel(table.croupier),
        },
        places: table.places.map((place, index) => place && {
            index,
            nom: place.nom,
            moi: index === maPlace,
            mise: place.mise,
            sideBets: place.sideBets,
            mains: place.mains.map(vueMain),
            sideBetsResultats: place.sideBetsResultats,
        }),
        active: table.active,
        zoneAttendue: zoneAttendue(table),
        instructionCroupier: instructionCroupier(table),
        alertes: table.alertes.map(({ message }) => message),
        visionConnectee: visionConnectee(table, maintenant),
        maPlace: maPlace === -1 ? null : maPlace,
        actions: maPlace === -1 ? [] : actionsPossibles(table, maPlace),
    };
}

module.exports = {
    creerTable, miser, annulerMise, totalMisePlace, actionsPossibles, coutAction, jouer, recevoirVision, tick,
    paiementsDus, vueTable, mainActive, carteManuelle, fermerMisesMaintenant, annulerManche, confirmerTableVide,
    NB_PLACES, PHASES,
};
