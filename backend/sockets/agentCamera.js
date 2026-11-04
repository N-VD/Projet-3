// Ouverture automatique des caméras quand des salons sont créés.
// Le backend roule dans Docker et n'a pas accès aux webcams : c'est agent_camera.py, sur la ou les
// machines qui ont des webcams, qui se connecte au namespace /agentCamera (protégé par CLE_CAMERA).
// Chaque connexion est un « poste » = une webcam (ex. "PC-JEROME:0"). Le backend attribue chaque salon
// à un poste libre ("demarrer") et le libère à la suppression du salon ("arreter").
// Plus de salons que de webcams : les salons en trop attendent qu'un poste se libère.

const mongoose = require('mongoose');
const Salon = require('../models/salon');

let agents = null; // namespace /agentCamera
const postes = new Map(); // socket.id -> { socket, nom, salonId }
const salonsCrees = []; // salons créés depuis le démarrage, du plus ancien au plus récent
let file = Promise.resolve(); // les attributions se font une à la fois

/** Sortie : ids des salons ouverts, du plus ancien au plus récent (la base, plus ceux créés en mémoire). */
async function salonsOuverts() {
    const ids = [...salonsCrees];
    if (mongoose.connection.readyState === 1) {
        try {
            // Après un redémarrage du backend (nodemon), la mémoire est vide : les salons fermés sont supprimés de la base
            const salons = await Salon.find({}, { _id: 1 }).sort({ _id: 1 });
            for (const salon of salons) {
                if (!ids.includes(String(salon._id))) ids.push(String(salon._id));
            }
        } catch (err) {
            console.error('[camera] Impossible de lire les salons :', err.message);
        }
    }
    return ids.sort(); // un ObjectId commence par sa date de création
}

/** Donne un salon pas encore filmé à chaque poste libre. */
function attribuer() {
    file = file.then(async () => {
        const libres = [...postes.values()].filter((poste) => !poste.salonId && poste.socket.connected);
        if (libres.length === 0) return;
        const filmes = new Set([...postes.values()].map((poste) => poste.salonId));
        const enAttente = (await salonsOuverts()).filter((salonId) => !filmes.has(salonId));
        for (const poste of libres) {
            const salonId = enAttente.shift();
            if (!salonId) break;
            poste.salonId = salonId;
            console.log(`[camera] Poste ${poste.nom} -> salon ${salonId}`);
            poste.socket.emit('demarrer', { salonId });
        }
        if (enAttente.length > 0) {
            console.log(`[camera] ${enAttente.length} salon(s) sans caméra libre : lancer agent_camera.py avec une autre webcam`);
        }
    });
    return file;
}

/** Entrées : instance Socket.IO et clé attendue des agents; sortie : le namespace /agentCamera. */
function brancherAgentCamera(io, cleCamera = process.env.CLE_CAMERA) {
    agents = io.of('/agentCamera');
    agents.use((socket, next) => {
        const { cle, poste } = socket.handshake.auth ?? {};
        if (!cleCamera) return next(new Error('CLE_CAMERA non configurée sur le serveur.'));
        if (cle !== cleCamera) return next(new Error('Clé caméra invalide.'));
        if (typeof poste !== 'string' || !poste) return next(new Error('Nom de poste manquant.'));
        socket.data.poste = poste;
        next();
    });
    agents.on('connection', (socket) => {
        const nom = socket.data.poste;
        // La même webcam lancée deux fois : l'ancienne connexion est remplacée (deux detection.py se battraient pour elle)
        for (const ancien of postes.values()) {
            if (ancien.nom === nom) ancien.socket.disconnect(true);
        }
        postes.set(socket.id, { socket, nom, salonId: null });
        console.log(`[camera] Poste ${nom} connecté`);

        socket.on('disconnect', () => {
            const { salonId } = postes.get(socket.id) ?? {};
            postes.delete(socket.id);
            console.log(`[camera] Poste ${nom} déconnecté`);
            if (salonId) attribuer(); // un autre poste libre peut reprendre ce salon
        });
        attribuer();
    });
    return agents;
}

/** Entrée : id du salon créé; lui attribue une caméra libre s'il y en a une. */
function demarrerCamera(salonId) {
    if (!salonsCrees.includes(String(salonId))) salonsCrees.push(String(salonId));
    if (agents && postes.size === 0) {
        console.log(`[camera] Aucun agent caméra connecté : lancer agent_camera.py pour filmer le salon ${salonId}`);
    }
    return attribuer();
}

/** Entrée : id du salon supprimé; ferme sa caméra et la donne à un salon en attente. */
function arreterCamera(salonId) {
    const index = salonsCrees.indexOf(String(salonId));
    if (index !== -1) salonsCrees.splice(index, 1);
    for (const poste of postes.values()) {
        if (poste.salonId === String(salonId)) {
            poste.salonId = null;
            poste.socket.emit('arreter', { salonId: String(salonId) });
        }
    }
    return attribuer();
}

module.exports = { brancherAgentCamera, demarrerCamera, arreterCamera };
