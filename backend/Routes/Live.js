const express = require('express');
const { authentifier } = require('../fonctionsCommunes');
const Compte = require('../models/compte');
const live = require('../jeux/blackjackLive');
const { arrondir, SIDE_BETS, RANGS, COULEURS } = require('../jeux/blackjack');
const tableLive = require('../jeux/tableLive');
const { debiter, crediter } = require('../argent');

const router = express.Router();

const ACTIONS = ['hit', 'stand', 'double', 'split'];
const CLE_VISION = process.env.LIVE_CLE_VISION || 'cle-vision-dev';

const ROLES_CROUPIER = ['croupier', 'admin'];

// Le service de vision Python s'identifie avec une clé partagée
function authentifierVision(req, res, next) {
    if (req.headers['x-cle-vision'] !== CLE_VISION) {
        return res.status(401).json({ message: "Clé de vision invalide" });
    }
    next();
}

function estCroupier(req, res, next) {
    if (!ROLES_CROUPIER.includes(req.user?.role?.toLowerCase())) {
        return res.status(403).json({ message: "Accès réservé aux croupiers" });
    }
    next();
}

async function soldeDe(idCompte) {
    return (await Compte.findById(idCompte))?.montant ?? 0;
}

router.get('/live/table', authentifier, async (req, res) => {
    const table = await tableLive.lire((etat, maintenant) => live.vueTable(etat, maintenant, req.user.id));
    res.json({ table, solde: await soldeDe(req.user.id) });
});

router.post('/live/miser', authentifier, async (req, res) => {
    const idCompte = req.user.id;
    const place = Number(req.body.place);
    const mise = arrondir(Number(req.body.mise));
    if (!Number.isFinite(mise) || mise <= 0) {
        return res.status(400).json({ message: "La mise doit être un nombre supérieur à zéro" });
    }
    const sideBets = {};
    for (const type of SIDE_BETS) {
        const montant = arrondir(Number(req.body.sideBets?.[type] ?? 0));
        if (!Number.isFinite(montant) || montant < 0) {
            return res.status(400).json({ message: "Les side bets doivent être des nombres positifs" });
        }
        if (montant > mise) {
            return res.status(400).json({ message: "Un side bet ne peut pas dépasser la mise principale" });
        }
        sideBets[type] = montant;
    }

    const compte = await Compte.findById(idCompte);
    if (!compte) {
        return res.status(404).json({ message: "Compte non trouvé" });
    }

    const erreur = await tableLive.modifier(async (table, maintenant) => {
        // Vérifie la place avant de débiter pour ne pas prélever une mise refusée
        const essai = structuredClone(table);
        const refus = live.miser(essai, place, { id: idCompte, nom: compte.nom }, mise, sideBets, maintenant);
        if (refus) return refus;

        const total = live.totalMisePlace({ mise, sideBets });
        if (!await debiter(idCompte, total, 'Mise blackjack live')) {
            return "Le total des mises ne peut pas dépasser votre solde";
        }
        live.miser(table, place, { id: idCompte, nom: compte.nom }, mise, sideBets, maintenant);
        return null;
    });
    if (erreur) {
        return res.status(400).json({ message: erreur });
    }
    const table = await tableLive.lire((etat, maintenant) => live.vueTable(etat, maintenant, idCompte));
    res.status(201).json({ table, solde: await soldeDe(idCompte) });
});

router.post('/live/annuler', authentifier, async (req, res) => {
    const idCompte = req.user.id;
    const erreur = await tableLive.modifier(async (table) => {
        const { erreur: refus, place } = live.annulerMise(table, idCompte);
        if (refus) return refus;
        await crediter(idCompte, live.totalMisePlace(place), 'Annulation mise blackjack live');
        return null;
    });
    if (erreur) {
        return res.status(400).json({ message: erreur });
    }
    const table = await tableLive.lire((etat, maintenant) => live.vueTable(etat, maintenant, idCompte));
    res.json({ table, solde: await soldeDe(idCompte) });
});

router.post('/live/action', authentifier, async (req, res) => {
    const idCompte = req.user.id;
    const { action } = req.body;
    if (!ACTIONS.includes(action)) {
        return res.status(400).json({ message: "Action inconnue" });
    }

    const erreur = await tableLive.modifier(async (table, maintenant) => {
        const place = table.places.findIndex((p) => p?.id_compte === idCompte);
        if (place === -1 || !live.actionsPossibles(table, place).includes(action)) {
            return "Action impossible pour le moment";
        }
        // Doubler ou séparer demande de miser à nouveau le montant de la main
        const cout = live.coutAction(table, action);
        if (cout > 0 && !await debiter(idCompte, cout, action === 'double' ? 'Double blackjack live' : 'Split blackjack live')) {
            return "Solde insuffisant : il faut au moins le montant de la mise";
        }
        live.jouer(table, action, maintenant);
        return null;
    });
    if (erreur) {
        return res.status(400).json({ message: erreur });
    }
    const table = await tableLive.lire((etat, maintenant) => live.vueTable(etat, maintenant, idCompte));
    res.json({ table, solde: await soldeDe(idCompte) });
});

function carteValide(carte) {
    return RANGS.includes(carte?.rang) && COULEURS.includes(carte?.couleur);
}

// Appelé en continu par le service de vision : cartes stables vues dans chaque zone de la table
router.post('/live/vision', authentifierVision, async (req, res) => {
    const zones = req.body.zones ?? {};
    const nettoyer = (cartes) => (Array.isArray(cartes) ? cartes.filter(carteValide) : []);
    const donnees = {
        zones: {
            croupier: nettoyer(zones.croupier),
            places: Array.isArray(zones.places) ? zones.places.slice(0, live.NB_PLACES).map(nettoyer) : [],
        },
        vide: req.body.vide === true,
    };
    const table = await tableLive.modifier((etat, maintenant) => {
        live.recevoirVision(etat, donnees, maintenant);
        return live.vueTable(etat, maintenant);
    });
    res.json({ table });
});

// --- Console du croupier ---

function vueCroupier() {
    return tableLive.lire((etat, maintenant) => live.vueTable(etat, maintenant));
}

// Exécute une commande du croupier qui retourne un message d'erreur ou null
async function commandeCroupier(res, commande) {
    const erreur = await tableLive.modifier(commande);
    if (erreur) {
        return res.status(400).json({ message: erreur });
    }
    res.json({ table: await vueCroupier() });
}

router.get('/live/croupier', authentifier, estCroupier, async (req, res) => {
    res.json({ table: await vueCroupier() });
});

router.post('/live/croupier/carte', authentifier, estCroupier, async (req, res) => {
    const carte = { rang: req.body.rang, couleur: req.body.couleur };
    if (!carteValide(carte)) {
        return res.status(400).json({ message: "Carte invalide" });
    }
    await commandeCroupier(res, (table, maintenant) => live.carteManuelle(table, carte, maintenant));
});

router.post('/live/croupier/fermer-mises', authentifier, estCroupier, async (req, res) => {
    await commandeCroupier(res, (table, maintenant) => live.fermerMisesMaintenant(table, maintenant));
});

router.post('/live/croupier/table-vide', authentifier, estCroupier, async (req, res) => {
    await commandeCroupier(res, (table) => live.confirmerTableVide(table));
});

router.post('/live/croupier/annuler-manche', authentifier, estCroupier, async (req, res) => {
    await commandeCroupier(res, (table, maintenant) => live.annulerManche(table, maintenant));
});

module.exports = router;
