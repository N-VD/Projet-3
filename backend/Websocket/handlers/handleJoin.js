import { WebSocket } from 'ws';

export function handleJoin(message, context, rooms, gameStates) {
  const code = typeof message.code === 'string' ? message.code.trim() : 'table-1';
  const nickname = typeof message.nickname === 'string' ? message.nickname.trim() : 'Anonyme';

  // Enregistrer les infos dans le contexte de cette connexion
  context.currentCode = code;
  context.nickname = nickname;

  // 1. Initialiser la room et l'état du jeu si absents
  if (!rooms.has(code)) {
    rooms.set(code, new Set());
    gameStates.set(code, {
      dealerHand: [],
      players: {},
      status: 'waiting_bets'
    });
  }
  rooms.get(code).add(context.ws);

  // 2. Ajouter le joueur dans l'état de la table
  const state = gameStates.get(code);
  state.players[context.playerId] = {
    id: context.playerId,
    nickname: nickname,
    chips: 1000,
    bet: 0,
    hand: [],
    status: 'waiting'
  };

  // 3. Diffuser l'information à toute la table
  broadcastToRoom(code, rooms, {
    type: 'chat',
    user: 'SYSTEM',
    text: `${nickname} a rejoint la table.`
  });
  broadcastToRoom(code, rooms, { type: 'state_update', state });
}

// Utilitaire interne de diffusion
function broadcastToRoom(code, rooms, message) {
  const json = JSON.stringify(message);
  for (const client of rooms.get(code) ?? []) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}