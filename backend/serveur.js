// backend/server.js
const app = require('./app');
const { createWss } = require('./Websocket/createwss'); // Attention aux majuscules/minuscules de ton dossier
const { setupHeartbeat } = require('./Websocket/setupHeartbeat');
const { handleConnection } = require('./Websocket/handleConnection');

const PORT = process.env.PORT || 3000;

// 1. Démarrer le serveur HTTP Express
const server = app.listen(PORT, () => {
  console.log(`Serveur HTTP et WebSocket démarré sur le port ${PORT}`);
});

// 2. Créer le serveur WebSocket sur /ws
const wss = createWss(server);

// 3. Activer la surveillance des connexions (Ping/Pong)
setupHeartbeat(wss);

// 4. Écouter les connexions entrantes
wss.on('connection', (ws, req) => {
  handleConnection(ws, req);
});