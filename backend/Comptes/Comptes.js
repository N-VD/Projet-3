const express = require('express');
const bcrypt = require('bcryptjs');
//const { Compte } = require('../tempDB');
const {authentifier , validerChamps, jwt, jwt_mdp} = require('../fonctionsCommunes');
const Compte = require('../models/Compte');//ajout 

const router = express.Router();

/* router.post('/register', async (req, res) => {
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
*/
//ajout
router.post('/register', async (req, res) => {
    const { nom, password, date_naissance, email, role, montant } = req.body;

    const validation = validerChamps({ nom, password, date_naissance, email, role, montant });
    if (validation !== true) {
        return res.status(400).json(validation);
    }

    // 1. AJOUT DE AWAIT + Utilisation de 'nom' et 'email'
    const existe = await Compte.findOne({ $or: [{ email }, { nom }] });
    if (existe) {
        return res.status(409).json({ message: "Compte ou courriel déjà existant" });
    }

    // 2. Hachage du mot de passe
    const hash = await bcrypt.hash(password, 10);

    // 3. AJOUT DE AWAIT + Utilisation des bons noms de champs Mongoose
    const nouveau = await Compte.create({ 
        nom, 
        password: hash, 
        date_naissance, 
        email, 
        role, 
        montant 
    });

    res.status(201).json({ message: "Compte créé", id: nouveau._id });
});

router.post('/login', async (req, res) => {
    const { nom, password } = req.body;
    
    // Recherche par le champ 'nom' du schéma
    const compte = await Compte.findOne({ nom });
    if (!compte) {
        return res.status(404).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    // Comparaison avec le champ 'password' du schéma
    const estValide = await bcrypt.compare(password, compte.password);
    if (!estValide) {
        return res.status(404).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
    }
    
    const token = jwt.sign(
        { id: compte._id, nom: compte.nom, role: compte.role }, 
        jwt_mdp, 
        { expiresIn: '1h' }
    ); 

    res.json({ token });
});

router.delete('/deleteCompte', authentifier, async (req, res) => {
    const { id } = req.body;
    
    // Vérifier si l'utilisateur est un administrateur
    if (req.user?.role?.toLowerCase() !== 'admin') {//ajout ??
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
