export function parseMessage(rawData, ws) {
  try {
    return JSON.parse(rawData.toString());
  } catch {
    ws.send(JSON.stringify({ type: 'error', error: 'Message illisible (JSON invalide).' }));
    return null;
  }
}