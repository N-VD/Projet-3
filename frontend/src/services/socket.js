let ws = null;

export function connectWebSocket(onMessageCallback) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Connexion sur le port 3000 de ton backend sur le chemin /ws
  const wsUrl = `${protocol}//${window.location.hostname}:3000/ws`;

  ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    console.log('Connecté au serveur WebSocket !');
  });

  ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (onMessageCallback) onMessageCallback(message);
    } catch (err) {
      console.error('Erreur de parsing JSON du WebSocket :', err);
    }
  });

  ws.addEventListener('close', () => {
    console.log('Déconnecté du WebSocket.');
  });

  return ws;
}

export function sendWebSocketMessage(type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  } else {
    console.warn('Impossible d’envoyer : le WebSocket n’est pas ouvert.');
  }
}