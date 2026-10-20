import { parseMessage } from './handlers/parseMessage.js';
import { handleJoin } from './handlers/handleJoin.js';
import { handleChat } from './handlers/handleChat.js';
import { handleDisconnect } from './handlers/handleDisconnect.js';

// Structures de données globales partagées par les tables
const rooms = new Map();       // codeTable -> Set(ws)
const gameStates = new Map();  // codeTable -> Objet État du jeu

export function handleConnection(ws, req) {
  // Configuration initiale de la connexion
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const context = {
    ws,
    playerId: Math.random().toString(36).substring(2, 9),
    currentCode: null,
    nickname: null
  };

  ws.on('message', (rawData) => {
    const message = parseMessage(rawData, ws);
    if (!message) return;

    // Routage selon le type de message
    if (message.type === 'join') {
      handleJoin(message, context, rooms, gameStates);
    } else if (message.type === 'chat') {
      handleChat(message, context, rooms, gameStates);
    }
  });

  ws.on('close', () => {
    handleDisconnect(context, rooms, gameStates);
  });

  ws.on('error', console.error);
}