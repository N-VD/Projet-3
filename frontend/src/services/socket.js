import { io } from "socket.io-client";

// URL de ton backend Socket.io
const SOCKET_URL = "http://localhost:3000";

let socket = null;

/**
 * Initialise et retourne la connexion Socket.io unique.
 */
export function connecterSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: true,
        });
    }
    return socket;
}

/**
 * Ferme proprement la connexion Socket.io.
 */
export function deconnecterSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}