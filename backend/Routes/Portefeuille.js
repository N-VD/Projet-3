const express = require('express');
const { authentifier } = require('../fonctionsCommunes');
const router = express.Router();
const Compte = require('../models/compte');

router.post('/ajouterArgent', authentifier, async (req, res) => {
    const { montant } = req.body;
    const idCompte = req.user.id; // Récupérer l'ID du compte à partir du token JWT
    const montantNumerique = Number(montant);

    if (!Number.isFinite(montantNumerique) || montantNumerique <= 0) {
        return res.status(400).json({ message: "Le montant doit être un nombre supérieur à zéro" });
    }

    // Vérifier si le compte existe
    const compte = await Compte.findById(idCompte);

    if (!compte) {
        return res.status(404).json({ message: "Compte non trouvé" });
    }

    // Ajouter le montant au compte
    compte.montant += montantNumerique;
    await compte.save();

    res.status(200).json({
        message: "Argent ajouté avec succès",
        compte: {
            id: compte._id,
            nom: compte.nom,
            montant: compte.montant
        }
    });
});

router.post('/retirerArgent', authentifier, async (req, res) => {
    const { montant } = req.body;
    const idCompte = req.user.id;

    const montantNumerique = Number(montant);

    if (!Number.isFinite(montantNumerique) || montantNumerique <= 0) {
        return res.status(400).json({ message: "Le montant doit être un nombre supérieur à zéro" });
    }

    // Vérifier si le compte existe
    const compte = await Compte.findById(idCompte);

    if (!compte) {
        return res.status(404).json({ message: "Compte non trouvé" });
    }

    // Vérifier si le compte a suffisamment d'argent
    if (compte.montant < montantNumerique) {
        return res.status(400).json({ message: "Fonds insuffisants" });
    }

    // Retirer le montant du compte
    compte.montant -= montantNumerique;
    await compte.save();

    res.status(200).json({
        message: "Argent retiré avec succès",
        compte: {
            id: compte._id,
            nom: compte.nom,
            montant: compte.montant
        }
    });
});

router.get('/solde', authentifier, async (req, res) => {
    const idCompte = req.user.id;

    // Vérifier si le compte existe
    const compte = await Compte.findById(idCompte);

    if (!compte) {
        return res.status(404).json({ message: "Compte non trouvé" });
    }

    res.status(200).json({
        solde: compte.montant
    });
});

module.exports = router;