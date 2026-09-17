const express = require('express');
const bcrypt = require('bcryptjs');
const { Compte } = require('../tempDB');
const {authentifier , validerChamps, jwt, jwt_mdp} = require('../fonctionsCommunes');

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
    const nouveau = Compte.create({ nomUtilisateur, motDePasse: hash, date_naissance, email, role, montant, created_at, statut: "actif" });
    res.status(201).json({ message: "Compte créé", id: nouveau.id });

});

router.post('/login', async (req, res) => {
    const { nomUtilisateur, motDePasse } = req.body;
    
    // Vérifier si le nom d'utilisateur existe
    const compte = await Compte.findOne({ nomUtilisateur });
    if (!compte) {
        return res.status(404).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe
    const estValide = await bcrypt.compare(motDePasse, compte.motDePasse);
    if (!estValide) {
        return res.status(404).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
    }
    
    // Générer un token JWT
    const token = jwt.sign({ id: compte.id, nomUtilisateur: compte.nomUtilisateur, role: compte.role, statut: compte.statut }, jwt_mdp, { expiresIn: '1h' });  
    res.json({ token });

});


router.delete('/:id', authentifier, async (req, res) => {
    const { id } = req.params;
    
    // Vérifier si l'utilisateur est un administrateur
    if (req.user.role.toLowerCase() !== 'admin') {
        return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas autorisé à supprimer des comptes." });
    }
    
    // Vérifier si le compte existe
    const compte = await Compte.findById(id);
    if (!compte) {
        return res.status(404).json({ message: "Compte non trouvé" });
    }

    // Supprimer le compte
    await Compte.findByIdAndDelete(id);
    res.json({ message: "Compte supprimé" });

});



module.exports = router;
