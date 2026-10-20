import{ WebSocketServer } from 'ws';

export const createWSS = (server) => {
    return new WebSocketServer({ server });
    } 