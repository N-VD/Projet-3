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
            // Lu à chaque (re)connexion : le serveur en déduit le rôle (pas de token = spectateur invité)
            auth: (envoyer) => envoyer({ token: localStorage.getItem("token") }),
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