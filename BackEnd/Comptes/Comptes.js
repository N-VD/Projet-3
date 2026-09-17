const express = require('express');
const bcrypt = require('bcryptjs');
const { Compte } = require('../tempDB');
const {authentifier , validerChamps} = require('../fonctionsCommunes');

const router = express.Router();

router.post('/register', async (req, res) => {
    const  { nomUtilisateur, motDePasse, date_naissance, email, role, montant, created_at } = req.body;

    // Vérifier si le nom d'utilisateur existe déjà

    const validation = validerChamps({ nomUtilisateur, motDePasse, date_naissance, email, role, montant, created_at });
    if (validation !== true) {
        return res.status(400).json(validation);
    }

    const existe = Compte.findOne({ nomUtilisateur });
    if (existe) {
        return res.status(409).json({ message: "Compte déjà existant" });
    }

    // Hacher le mot de passe
    const hash = await bcrypt.hash(motDePasse, 10);

    // Créer le nouveau compte
    const nouveau = Compte.create({ nomUtilisateur, motDePasse: hash, date_naissance, email, role, montant, created_at });
    res.status(201).json({ message: "Compte créé", id: nouveau.id });

});


module.exports = router;
