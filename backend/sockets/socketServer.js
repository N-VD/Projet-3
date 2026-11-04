const { Server } = require('socket.io');
const { brancherTempsReel } = require('./tempsReel');
const { brancherAgentCamera } = require('./agentCamera');

/**
 * Initialise le serveur Socket.io et configure les événements de temps réel.
 * @param {http.Server} httpServer - Le serveur HTTP Node.js créé dans app.js
 * @returns {Server} L'instance de Socket.io
 */
function initialiserSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"]
        },
        maxHttpBufferSize: 2e6 // images JPEG de la caméra (~50 Ko chacune), on garde de la marge
    });

    // Vidéo et cartes de la table réelle (namespace /camera + événement "rejoindre")
    brancherTempsReel(io);
    // Agent sur la machine de la webcam : lance detection.py à la création d'un salon (namespace /agentCamera)
    brancherAgentCamera(io);

    io.on('connection', (socket) => {
        console.log(`Un joueur s'est connecté : ${socket.id}`);

        // Rejoindre un salon de Blackjack
        socket.on('rejoindre_salon', (codeSalon) => {
            socket.join(codeSalon);
            console.log(`Le joueur ${socket.id} a rejoint le salon : ${codeSalon}`);
        });

        // Gérer une action de jeu et diffuser l'état complet du salon aux autres
        socket.on('action_jeu', (data) => {
            const { codeSalon, salonMaj } = data;
            
            // On diffuse le salon mis à jour à tous les joueurs présents dans ce salon (sauf l'expéditeur, ou à tout le monde avec io.to)
            io.to(codeSalon).emit('mise_a_jour_table', {
                salon: salonMaj,
                message: `Mise à jour de la table pour le salon ${codeSalon}`
            });
        });

        socket.on('disconnect', () => {
            console.log(`Un joueur s'est déconnecté : ${socket.id}`);
        });
    });

    return io;
}

module.exports = { initialiserSocketServer };