const Message = require('../models/message');
const { jwt, jwt_mdp } = require('../fonctionsCommunes');

const LONGUEUR_MAX = 200;
const DELAI_MS = 1000; // anti-spam : 1 message par seconde

function initialiserChat(io, socket) {
    let dernierEnvoi = 0;

    // Rejoindre le chat d'une table + recevoir les 50 derniers messages
    socket.on('chat_rejoindre', async (salonId) => {
        socket.join(`chat:${salonId}`);
        const historique = await Message.find({ salonId })
            .sort({ created_at: -1 }).limit(50).lean();
        socket.emit('chat_historique', historique.reverse());
    });

    socket.on('chat_quitter', (salonId) => socket.leave(`chat:${salonId}`));

    socket.on('chat_envoyer', async ({ salonId, texte, token }) => {
        // 1. Le nom vient du token vérifié, jamais du client
        let user;
        try { user = jwt.verify(token, jwt_mdp); }
        catch { return socket.emit('chat_erreur', 'Connecte-toi pour écrire dans le chat.'); }

        // 2. Validation
        const propre = String(texte ?? '').trim().slice(0, LONGUEUR_MAX);
        if (!propre) return;
        if (Date.now() - dernierEnvoi < DELAI_MS) {
            return socket.emit('chat_erreur', 'Doucement ! 1 message par seconde.');
        }
        dernierEnvoi = Date.now();

        // 3. Sauvegarde + diffusion à toute la table
        const msg = await Message.create({ salonId, nom: user.nom, role: user.role, texte: propre });
        io.to(`chat:${salonId}`).emit('chat_message', msg);
    });
}

module.exports = { initialiserChat };
