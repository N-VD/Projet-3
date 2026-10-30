const express = require('express');
const { validerChamps, validerAge, genererToken, jwt, jwt_mdp } = require('../fonctionsCommunes');
const Compte = require('../models/compte');

const router = express.Router();

// Le token d'inscription utilise un secret distinct : il ne doit jamais être accepté par authentifier()
const SECRET_INSCRIPTION = `${jwt_mdp}-inscription-github`;

function configGithub() {
    return {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI ?? 'http://localhost:5173/auth/github/callback'
    };
}

// Échange le code reçu de GitHub contre un access token (null si GitHub refuse le code)
async function echangerCode(code) {
    const { clientId, clientSecret, redirectUri } = configGithub();
    const reponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
    });
    const data = await reponse.json();
    return data.access_token ?? null;
}

async function appelerApiGithub(chemin, accessToken) {
    const reponse = await fetch(`https://api.github.com${chemin}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
    });
    if (!reponse.ok) {
        throw new Error(`GitHub ${chemin} : ${reponse.status}`);
    }
    return reponse.json();
}

// Redirige le navigateur vers la page d'autorisation GitHub.
// Le state est généré et conservé par le frontend, qui le vérifie au retour (protection CSRF).
router.get('/auth/github', (req, res) => {
    const { state } = req.query;
    const { clientId, redirectUri } = configGithub();

    if (!clientId) {
        return res.status(500).json({ message: "La connexion GitHub n'est pas configurée sur le serveur" });
    }
    if (typeof state !== 'string' || !/^[\w-]{16,128}$/.test(state)) {
        return res.status(400).json({ message: "Paramètre state invalide" });
    }

    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: 'user:email', state });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Reçoit le code d'autorisation : connecte le compte existant, ou demande l'âge si ce githubId est nouveau
router.post('/auth/github', async (req, res) => {
    const { code } = req.body;
    if (typeof code !== 'string' || !code) {
        return res.status(400).json({ message: "Code d'autorisation manquant" });
    }

    let profil, courriels;
    try {
        const accessToken = await echangerCode(code);
        if (!accessToken) {
            return res.status(401).json({ message: "GitHub a refusé l'autorisation. Réessayez." });
        }
        profil = await appelerApiGithub('/user', accessToken);
        courriels = await appelerApiGithub('/user/emails', accessToken);
    } catch {
        return res.status(502).json({ message: "Impossible de communiquer avec GitHub" });
    }

    const githubId = String(profil.id);
    const compte = await Compte.findOne({ githubId });
    if (compte) {
        return res.json({ token: genererToken(compte) });
    }

    // Première connexion de ce githubId : on ne crée le compte qu'une fois l'âge vérifié
    const principal = courriels.find((c) => c.primary && c.verified);
    if (!principal) {
        return res.status(400).json({ message: "Votre compte GitHub n'a aucun courriel principal vérifié" });
    }
    if (await Compte.exists({ email: principal.email })) {
        return res.status(409).json({ message: "Ce courriel est déjà associé à un compte. Connectez-vous avec votre mot de passe." });
    }

    const tokenInscription = jwt.sign(
        { githubId, email: principal.email },
        SECRET_INSCRIPTION,
        { expiresIn: '15m' }
    );
    res.json({ inscriptionRequise: true, tokenInscription, nomSuggere: profil.login });
});

// Termine l'inscription GitHub une fois la date de naissance fournie
router.post('/auth/github/inscription', async (req, res) => {
    const { tokenInscription, nom, date_naissance } = req.body;

    const validation = validerChamps({ tokenInscription, nom, date_naissance });
    if (validation !== true) {
        return res.status(400).json(validation);
    }

    let inscription;
    try {
        inscription = jwt.verify(tokenInscription, SECRET_INSCRIPTION);
    } catch {
        return res.status(401).json({ message: "La session d'inscription a expiré. Reconnectez-vous avec GitHub." });
    }

    const erreurAge = validerAge(date_naissance);
    if (erreurAge) {
        return res.status(400).json({ error: erreurAge });
    }

    const nomNettoye = String(nom).trim();
    if (await Compte.exists({ nom: nomNettoye })) {
        return res.status(409).json({ message: "Ce nom d'utilisateur est déjà pris" });
    }

    try {
        const nouveau = await Compte.create({
            nom: nomNettoye,
            githubId: inscription.githubId,
            email: inscription.email,
            date_naissance,
            role: 'player'
        });
        res.status(201).json({ message: "Compte créé", id: nouveau._id, token: genererToken(nouveau) });
    } catch (err) {
        // Doublon inséré entre la vérification et la création (nom, courriel ou githubId)
        if (err.code === 11000) {
            return res.status(409).json({ message: "Compte ou courriel déjà existant" });
        }
        res.status(500).json({ message: "Erreur lors de la création du compte" });
    }
});

module.exports = router;
