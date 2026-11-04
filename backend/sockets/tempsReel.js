const mongoose = require('mongoose');
const { lireMains, etatTable } = require('../jeux/tableCamera');

// Temps réel de la caméra, branché sur l'instance Socket.IO de socketServer.js :
// - namespace /camera : detection.py (protégé par CLE_CAMERA) envoie les images JPEG ("frame")
//   et les mains lues ("cartes") pour un salon;
// - namespace principal : le front rejoint un salon ("rejoindre") et reçoit "frame" et "tableCamera".

const salle = (salonId) => `salon:${salonId}`;

function etatVide() {
    return { camera: false, timestamp: null, table: etatTable([]) };
}

/**
 * Entrées : instance Socket.IO et clé attendue de detection.py; sortie : la même instance.
 * L'instance doit accepter des messages d'au moins ~100 Ko (maxHttpBufferSize) pour les images.
 */
function brancherTempsReel(io, cleCamera = process.env.CLE_CAMERA) {
    const etats = new Map(); // salonId -> dernier état connu de la table réelle

    const camera = io.of('/camera');
    camera.use((socket, next) => {
        const { cle, salon } = socket.handshake.auth ?? {};
        if (!cleCamera) return next(new Error('CLE_CAMERA non configurée sur le serveur.'));
        if (cle !== cleCamera) return next(new Error('Clé caméra invalide.'));
        if (!mongoose.isValidObjectId(salon)) return next(new Error('Identifiant de salon invalide.'));
        socket.data.salonId = String(salon);
        next();
    });

    camera.on('connection', (socket) => {
        const salonId = socket.data.salonId;
        const etat = etats.get(salonId) ?? etatVide();
        etats.set(salonId, etat);
        etat.camera = true;
        console.log(`[camera] detection.py connecté au salon ${salonId}`);
        io.to(salle(salonId)).emit('tableCamera', etat);

        socket.on('frame', (jpeg) => {
            if (!Buffer.isBuffer(jpeg)) return;
            // volatile : un spectateur trop lent saute des images au lieu de les accumuler
            io.to(salle(salonId)).volatile.emit('frame', jpeg);
        });

        socket.on('cartes', (message) => {
            const mains = lireMains(message?.mains);
            if (!mains) return;
            etat.table = etatTable(mains);
            etat.timestamp = typeof message.timestamp === 'number' ? message.timestamp : Date.now() / 1000;
            io.to(salle(salonId)).emit('tableCamera', etat);
        });

        socket.on('disconnect', (raison) => {
            console.log(`[camera] detection.py déconnecté du salon ${salonId} (${raison})`);
            etat.camera = false;
            io.to(salle(salonId)).emit('tableCamera', etat);
        });
    });

    io.on('connection', (socket) => {
        socket.on('rejoindre', (salonId) => {
            if (!mongoose.isValidObjectId(salonId)) return;
            for (const room of socket.rooms) {
                if (room.startsWith('salon:')) socket.leave(room);
            }
            socket.join(salle(salonId));
            socket.emit('tableCamera', etats.get(String(salonId)) ?? etatVide());
        });
    });

    return io;
}

module.exports = { brancherTempsReel };
