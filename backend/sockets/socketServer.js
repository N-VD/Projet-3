const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Salon = require("../models/salon");
const { lireToken } = require("../fonctionsCommunes");
const { roleDansSalon, vuePourRole } = require("../jeux/vueTable");

function initialiserSocketServer(httpServer) {
	const io = new Server(httpServer, {
		cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
		maxHttpBufferSize: 2e6, // images JPEG de la caméra
	});

	io.on("connection", (socket) => {

		// Service Python de détection. La clé doit exister : sinon undefined === undefined laisserait passer tout le monde
		const cle = process.env.CLE_DETECTION;
		if (cle && socket.handshake.auth?.cle === cle) {
			socket.join("detection");
			socket.on("cartes", ({ salonId, mains }) => {
				io.to(String(salonId)).emit("cartes", mains);
			});
			return; // pas besoin des handlers des navigateurs
		}

		// Navigateur : connecté (token valide) ou invité (pas de token → user = null)
		socket.data.user = lireToken(socket.handshake.auth?.token);

		// Le rôle (dealer, joueur, spectateur) est calculé ici à partir du token, jamais envoyé par le client
		socket.on("join", async (salonId, ack) => {
			const repondre = typeof ack === "function" ? ack : () => {}; // Blackjack.jsx n'attend pas de réponse
			try {
				if (!mongoose.isValidObjectId(salonId))
					return repondre({ error: "Salon invalide." });
				const salon = await Salon.findById(salonId);
				if (!salon) return repondre({ error: "Salon introuvable." });

				// Une connexion suit un seul salon (socket.id est sa room personnelle : on la garde)
				for (const room of socket.rooms) {
					if (room !== socket.id) socket.leave(room);
				}
				const room = String(salon._id);
				const role = roleDansSalon(salon, socket.data.user);
				socket.join(room);
				socket.data.salonId = room;
				socket.data.role = role;
				repondre({ salon: vuePourRole(salon.toObject(), role), role });
			} catch (err) {
				console.error(err);
				repondre({ error: "Erreur du serveur." });
			}
		});

		// Action de jeu (joueur ou dealer seulement). Le salon est celui du "join" : le client ne peut pas en viser un autre.
		// Chaque connexion de la room reçoit la vue de son rôle.
		socket.on("game:action", async ({ salonMaj } = {}) => {
			const { salonId, role } = socket.data;
			if (!salonId || (role !== "joueur" && role !== "dealer")) return;
			if (!salonMaj || typeof salonMaj !== "object") return;
			const connexions = await io.in(salonId).fetchSockets();
			for (const connexion of connexions) {
				connexion.emit("game:update", {
					salon: vuePourRole(salonMaj, connexion.data.role),
					message: `Mise à jour de la table pour le salon ${salonId}`,
				});
			}
		});

		// Image JPEG de la caméra, envoyée seulement par le dealer du salon
		socket.on("frame", (image) => {
			const { salonId, role } = socket.data;
			if (!salonId || role !== "dealer" || !Buffer.isBuffer(image)) return;
			socket.to(salonId).volatile.emit("frame", image); // joueurs / spectateurs
			io.to("detection").volatile.emit("frame", { salonId, image }); // service Python
		});
	});

	return io;
}

module.exports = { initialiserSocketServer };
