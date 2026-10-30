const jwt = require('jsonwebtoken')
const jwt_mdp = "Belle_Vibe_Casino2026"

 const authentifier = (req, res, next) => {
    // récupère le header 'authorization'
    const authHeader = req.headers['authorization']
    // sépare le "Bearer {token}" en 2 (séparés par l'espace) 
    // et garde seulement le token 
    const token = authHeader && authHeader.split(' ')[1]
    // erreur si pas de token
    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Token manquant." })
    }
    try {
        // décode le token et le renvoye dans la requête dans user
        const userDecoded = jwt.verify(token, jwt_mdp)
        req.user = userDecoded
        //if (req.user?.statut.toLowerCase() != "actif") {//ajout de ?
        if (req.user?.statut && req.user.statut.toLowerCase() !== "actif") {
            return res.status(403).json({ message: "Accès refusé. Compte employé inactif"})
        }
        next()
    }
    catch (error) {
        return res.status(401).json({ message: "Token invalide ou expiré" })
    }
}

function validerChamps(champs) {
    for (const [nom, valeur] of Object.entries(champs)) {
        if (valeur === undefined || valeur === null || valeur === '') {
            return { error: `Champ '${nom}' obligatoire.` };
        }
    }
    return true;
}

// Règles : au moins 8 caractères, dont au moins un caractère spécial
function validerMotDePasse(motDePasse) {
    if (typeof motDePasse !== 'string' || motDePasse.length < 8) {
        return "Le mot de passe doit contenir au moins 8 caractères.";
    }
    if (!/[^A-Za-z0-9]/.test(motDePasse)) {
        return "Le mot de passe doit contenir au moins un caractère spécial.";
    }
    return null;
}

function validerAge(dateNaissance) {
    const naissance = new Date(dateNaissance);
    if (isNaN(naissance.getTime())) {
        return "La date de naissance est invalide.";
    }
    const majorite = new Date(naissance);
    majorite.setFullYear(naissance.getFullYear() + 18);
    if (majorite > new Date()) {
        return "Vous devez avoir au moins 18 ans pour vous inscrire.";
    }
    return null;
}

module.exports = {authentifier, validerChamps, validerMotDePasse, validerAge, jwt, jwt_mdp}