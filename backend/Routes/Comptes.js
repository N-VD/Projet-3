const express = require('express');
const bcrypt = require('bcryptjs');
//const { Compte } = require('../tempDB');
const {authentifier , validerChamps, validerMotDePasse, validerAge, jwt, jwt_mdp} = require('../fonctionsCommunes');
const Compte = require('../models/compte');//ajout 

const router = express.Router();


const MESSAGE_CONNEXION_INVALIDE = "Identifiants incorrects";

function genererToken(compte) {
    return jwt.sign(
        { id: compte._id, nom: compte.nom, role: compte.role },
        jwt_mdp,
        { expiresIn: '1h' }
    );
}

router.post('/register', async (req, res) => {
    const { nom, password, date_naissance, email } = req.body;

    const validation = validerChamps({ nom, password, date_naissance, email });
    if (validation !== true) {
        return res.status(400).json(validation);
    }

    const erreurMotDePasse = validerMotDePasse(password);
    if (erreurMotDePasse) {
        return res.status(400).json({ error: erreurMotDePasse });
    }

    const erreurAge = validerAge(date_naissance);
    if (erreurAge) {
        return res.status(400).json({ error: erreurAge });
    }

    // Courriel et nom d'utilisateur doivent être uniques
    if (await Compte.exists({ email })) {
        return res.status(409).json({ message: "Ce courriel est déjà utilisé" });
    }
    if (await Compte.exists({ nom })) {
        return res.status(409).json({ message: "Ce nom d'utilisateur est déjà pris" });
    }

    const hash = await bcrypt.hash(password, 10);

    try {
        // Un visiteur crée toujours un compte joueur (le rôle et le montant ne viennent pas du client)
        const nouveau = await Compte.create({ nom, password: hash, date_naissance, email, role: 'player' });

        // Connexion automatique après l'inscription
        res.status(201).json({ message: "Compte créé", id: nouveau._id, token: genererToken(nouveau) });
    } catch (err) {
        // Doublon inséré entre la vérification et la création
        if (err.code === 11000) {
            return res.status(409).json({ message: "Compte ou courriel déjà existant" });
        }
        res.status(500).json({ message: "Erreur lors de la création du compte" });
    }
});

router.post('/login', async (req, res) => {
    // L'identifiant peut être le nom d'utilisateur ou le courriel
    const identifiant = req.body.identifiant ?? req.body.nom;
    const { password } = req.body;

    const validation = validerChamps({ identifiant, password });
    if (validation !== true) {
        return res.status(400).json(validation);
    }

    const compte = await Compte.findOne({ $or: [{ nom: identifiant }, { email: identifiant }] });

    // Message générique : on ne révèle pas si c'est l'identifiant ou le mot de passe qui est fautif
    if (!compte || !(await bcrypt.compare(password, compte.password))) {
        return res.status(401).json({ message: MESSAGE_CONNEXION_INVALIDE });
    }

    res.json({ token: genererToken(compte) });
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

// Récupérer les informations du compte connecté
router.get('/me', authentifier, async (req, res) => {
    const compte = await Compte.findById(req.user.id).select('-password'); // Exclure le mot de passe

    if (!compte) {
        return res.status(404).json({ message: "Compte non trouvé" });
    }

    res.json(compte);
});




module.exports = router;
