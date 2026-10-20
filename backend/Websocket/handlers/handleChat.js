import { WebSocket } from 'ws';

export function handleChat(message, context, rooms, gameStates) {
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  if (text === '' || text.length > 200) {
    return context.ws.send(JSON.stringify({ type: 'error', error: 'Message invalide ou trop long.' }));
  }

  const { currentCode, playerId, nickname, ws } = context;
  if (!currentCode || !rooms.has(currentCode)) return;

  const state = gameStates.get(currentCode);
  const player = state?.players[playerId];

  // Intercepter les commandes de type Twitch
  if (text.startsWith('!bet ')) {
    const amount = parseInt(text.split(' ')[1]);
    if (!player || isNaN(amount) || amount <= 0 || amount > player.chips) {
      return ws.send(JSON.stringify({ type: 'error', error: 'Mise invalide ou jetons insuffisants.' }));
    }
    player.bet = amount;
    player.chips -= amount;
    player.status = 'ready';

    broadcastToRoom(currentCode, rooms, { type: 'chat', user: 'SYSTEM', text: `${nickname} a misé $${amount}` });
    broadcastToRoom(currentCode, rooms, { type: 'state_update', state });
  } 
  else if (text === '!hit') {
    broadcastToRoom(currentCode, rooms, { type: 'chat', user: 'SYSTEM', text: `${nickname} demande une carte (!hit).` });
    // Logique métier Blackjack (tirer une carte) à ajouter ici plus tard
  } 
  else if (text === '!stand') {
    if (player) player.status = 'stood';
    broadcastToRoom(currentCode, rooms, { type: 'chat', user: 'SYSTEM', text: `${nickname} s'arrête (!stand).` });
    broadcastToRoom(currentCode, rooms, { type: 'state_update', state });
  } 
  else {
    // Chat textuel normal diffusé à tous
    broadcastToRoom(currentCode, rooms, { type: 'chat', user: nickname, text });
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