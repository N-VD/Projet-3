import { WebSocket } from 'ws';

export function handleDisconnect(context, rooms, gameStates) {
  const { currentCode, playerId, nickname, ws } = context;
  if (!currentCode || !rooms.has(currentCode)) return;

  const room = rooms.get(currentCode);
  room.delete(ws);

  const state = gameStates.get(currentCode);
  if (state && state.players[playerId]) {
    delete state.players[playerId];

    broadcastToRoom(currentCode, rooms, {
      type: 'chat',
      user: 'SYSTEM',
      text: `${nickname || 'Un joueur'} a quitté la table.`
    });
    broadcastToRoom(currentCode, rooms, { type: 'state_update', state });
  }

  // Si la table est complètement vide, on libère la mémoire
  if (room.size === 0) {
    rooms.delete(currentCode);
    gameStates.delete(currentCode);
  }
}

function broadcastToRoom(code, rooms, message) {
  const json = JSON.stringify(message);
  for (const client of rooms.get(code) ?? []) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}