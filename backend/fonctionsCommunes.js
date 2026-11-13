const jwt = require('jsonwebtoken')
const jwt_mdp = "Belle_Vibe_Casino2026"
const Compte = require('./models/compte');

 const authentifier = async (req, res, next) => {
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

        // --- VÉRIFICATION EN DIRECT DANS LA BASE DE DONNÉES ---
        const compteActuel = await Compte.findById(userDecoded.id);
        if (!compteActuel) {
            return res.status(401).json({ message: "Compte introuvable." });
        }

        // Vérifier si le compte est banni
        if (compteActuel.ban_status) {
            // Vérifier si un ban temporaire a expiré
            if (compteActuel.ban_expires_at && new Date() > new Date(compteActuel.ban_expires_at)) {
                compteActuel.ban_status = false;
                compteActuel.ban_expires_at = null;
                await compteActuel.save();
            } else {
                return res.status(403).json({ message: "Accès refusé. Votre compte a été suspendu." });
            }
        }
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

// Comme authentifier, mais laisse passer les invités sans token (req.user = null).
// Un token présent mais invalide est quand même refusé (401) : le front sait alors qu'il doit le retirer.
const authentifierOptionnel = (req, res, next) => {
    if (!req.headers['authorization']) {
        req.user = null
        return next()
    }
    return authentifier(req, res, next)
}

// Entrée : token JWT (ou rien); sortie : le compte décodé, ou null s'il est absent, invalide ou inactif.
// Pour Socket.IO, où un invité doit pouvoir se connecter quand même.
function lireToken(token) {
    if (!token) return null
    try {
        const user = jwt.verify(token, jwt_mdp)
        if (user?.statut && user.statut.toLowerCase() !== "actif") return null
        return user
    } catch {
        return null
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

function genererToken(compte) {
    return jwt.sign(
        { id: compte._id, nom: compte.nom, role: compte.role },
        jwt_mdp,
        { expiresIn: '1h' }
    );
}

module.exports = {authentifier, authentifierOptionnel, lireToken, validerChamps, validerMotDePasse, validerAge, genererToken, jwt, jwt_mdp}