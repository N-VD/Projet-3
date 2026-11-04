const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Salon = require("../models/salon");

function initialiserSocketServer(httpServer) {
	const io = new Server(httpServer, {
		cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
		maxHttpBufferSize: 2e6, // images JPEG de la caméra
	});

	io.on("connection", (socket) => {

		if (socket.handshake.auth?.cle === process.env.CLE_DETECTION) {
			socket.join("detection");
			socket.on("cartes", ({ salonId, mains }) => {
				io.to(String(salonId)).emit("cartes", mains);
			});
			return; // pas besoin des handlers des navigateurs
		}

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
				socket.join(room);
				socket.data.salonId = room;
				repondre({ salon });
			} catch (err) {
				console.error(err);
				repondre({ error: "Erreur du serveur." });
			}
		});

		// codeSalon = _id du salon (voir sauvegarder() dans Blackjack.jsx)
		socket.on("game:action", ({ codeSalon, salonMaj }) => {
			io.to(String(codeSalon)).emit("game:update", {
				salon: salonMaj,
				message: `Mise à jour de la table pour le salon ${codeSalon}`,
			});
		});

		// Image JPEG de detection.py, relayée aux clients du salon
		socket.on("frame", (image) => {
			const salonId = socket.data.salonId;
			if (!salonId || !Buffer.isBuffer(image)) return;
			socket.to(salonId).volatile.emit("frame", image); // joueurs / spectateurs
			io.to("detection").volatile.emit("frame", { salonId, image }); // service Python
		});
	});

	return io;
}

module.exports = { initialiserSocketServer };
