const express = require('express');
const { authentifier } = require('../fonctionsCommunes');
const Compte = require('../models/compte');
const Transaction = require('../models/transaction');
const PartieBlackjack = require('../models/partieBlackjack');
const blackjack = require('../jeux/blackjack');

const router = express.Router();

const ACTIONS = ['hit', 'stand', 'double', 'split'];

// Retire le montant seulement si le solde est suffisant (opération atomique : le solde ne peut devenir négatif)
async function debiter(idCompte, montant, desc) {
    const compte = await Compte.findOneAndUpdate(
        { _id: idCompte, montant: { $gte: montant } },
        { $inc: { montant: -montant } },
        { new: true }
    );
    if (compte) {
        await Transaction.create({ id_compte: idCompte, desc, montant: -montant });
    }
    return compte;
}

async function crediter(idCompte, montant, desc) {
    const compte = await Compte.findByIdAndUpdate(idCompte, { $inc: { montant } }, { new: true });
    await Transaction.create({ id_compte: idCompte, desc, montant });
    return compte;
}

// Verse les gains quand la main est terminée et retourne le solde à jour
async function payerSiTerminee(partie, solde) {
    if (partie.statut !== 'terminee') return solde;
    const total = blackjack.arrondir(partie.mains.reduce((somme, main) => somme + main.gain, 0));
    if (total <= 0) return solde;
    const compte = await crediter(partie.id_compte, total, 'Gain blackjack');
    return compte.montant;
}

function reponse(partie, solde) {
    return { partie: blackjack.vuePartie(partie.toObject(), solde), solde };
}

router.get('/blackjack/partie', authentifier, async (req, res) => {
    const compte = await Compte.findById(req.user.id);
    if (!compte) {
        return res.status(404).json({ message: "Compte non trouvé" });
    }

    const partie = await PartieBlackjack.findOne({ id_compte: compte._id, statut: 'en_cours' });
    if (!partie) {
        return res.json({ partie: null, solde: compte.montant });
    }
    res.json(reponse(partie, compte.montant));
});

router.post('/blackjack/miser', authentifier, async (req, res) => {
    const idCompte = req.user.id;
    const mise = blackjack.arrondir(Number(req.body.mise));

    if (!Number.isFinite(mise) || mise <= 0) {
        return res.status(400).json({ message: "La mise doit être un nombre supérieur à zéro" });
    }

    if (await PartieBlackjack.exists({ id_compte: idCompte, statut: 'en_cours' })) {
        return res.status(409).json({ message: "Une main est déjà en cours" });
    }

    const compte = await debiter(idCompte, mise, 'Mise blackjack');
    if (!compte) {
        return res.status(400).json({ message: "La mise ne peut pas dépasser votre solde" });
    }

    let partie;
    try {
        partie = await PartieBlackjack.create({ id_compte: idCompte, ...blackjack.distribuer(mise) });
    } catch (err) {
        await crediter(idCompte, mise, 'Remboursement mise blackjack');
        if (err.code === 11000) {
            return res.status(409).json({ message: "Une main est déjà en cours" });
        }
        return res.status(500).json({ message: "Erreur lors de la distribution" });
    }

    const solde = await payerSiTerminee(partie, compte.montant);
    res.status(201).json(reponse(partie, solde));
});

router.post('/blackjack/action', authentifier, async (req, res) => {
    const idCompte = req.user.id;
    const { action } = req.body;

    if (!ACTIONS.includes(action)) {
        return res.status(400).json({ message: "Action inconnue" });
    }

    const partie = await PartieBlackjack.findOne({ id_compte: idCompte, statut: 'en_cours' });
    if (!partie) {
        return res.status(404).json({ message: "Aucune main en cours" });
    }

    let compte = await Compte.findById(idCompte);
    const etat = partie.toObject();

    if (!blackjack.actionsPossibles(etat, compte.montant).includes(action)) {
        const message = (action === 'double' || action === 'split') && compte.montant < etat.mains[etat.mainActive].mise
            ? "Solde insuffisant : il faut au moins le montant de la mise"
            : "Action impossible pour cette main";
        return res.status(400).json({ message });
    }

    // Doubler ou séparer demande de miser à nouveau le montant de la main
    let cout = 0;
    if (action === 'double' || action === 'split') {
        cout = etat.mains[etat.mainActive].mise;
        compte = await debiter(idCompte, cout, action === 'double' ? 'Double blackjack' : 'Split blackjack');
        if (!compte) {
            return res.status(400).json({ message: "Solde insuffisant : il faut au moins le montant de la mise" });
        }
    }

    blackjack.jouer(etat, action);
    partie.set({
        statut: etat.statut,
        sabot: etat.sabot,
        croupier: etat.croupier,
        mains: etat.mains,
        mainActive: etat.mainActive
    });

    try {
        await partie.save();
    } catch (err) {
        if (cout > 0) {
            await crediter(idCompte, cout, 'Remboursement blackjack');
        }
        if (err.name === 'VersionError') {
            return res.status(409).json({ message: "Une autre action est déjà en cours, réessayez" });
        }
        return res.status(500).json({ message: "Erreur lors de l'action" });
    }

    const solde = await payerSiTerminee(partie, compte.montant);
    res.json(reponse(partie, solde));
});

module.exports = router;
