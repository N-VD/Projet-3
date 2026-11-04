const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Salon = require("../models/salon");
const { lireToken } = require("../fonctionsCommunes");
const { roleDansSalon, vuePourRole } = require("../jeux/vueTable");

let io = null; // gardé pour notifierSalonFerme (appelé depuis la route DELETE /deleteSalon)
const departs = new Map(); // "salonId:compteId" -> minuterie d'un joueur déconnecté sans prévenir

/** Entrées : room du salon et salon (objet); sortie : aucune. Chaque connexion de la room reçoit la vue de son rôle. */
async function diffuserTable(salonId, salon) {
	const connexions = await io.in(salonId).fetchSockets();
	for (const connexion of connexions) {
		connexion.emit("game:update", {
			salon: vuePourRole(salon, connexion.data.role),
			message: `Mise à jour de la table pour le salon ${salonId}`,
		});
	}
}

/** Entrées : salon et compte; retire le joueur (sa main est perdue), sauvegarde et prévient la table. */
async function retirerJoueur(salonId, compteId) {
	const salon = await Salon.findById(salonId);
	if (!salon) return;
	const restants = salon.players.filter((player) => String(player.id_compte) !== String(compteId));
	if (restants.length === salon.players.length) return; // déjà parti
	salon.players = restants;
	salon.updated_at = new Date();
	await salon.save();
	await diffuserTable(String(salon._id), salon.toObject());
}

function annulerDepart(salonId, compteId) {
	const cle = `${salonId}:${compteId}`;
	clearTimeout(departs.get(cle));
	departs.delete(cle);
}

/** Entrée : id du salon supprimé; prévient la table ("salon:closed") et vide sa room. */
function notifierSalonFerme(salonId) {
	if (!io) return;
	const room = String(salonId);
	io.to(room).emit("salon:closed", { salonId: room });
	io.in(room).socketsLeave(room);
	for (const [cle, minuterie] of departs) {
		if (cle.startsWith(`${room}:`)) {
			clearTimeout(minuterie);
			departs.delete(cle);
		}
	}
}

/**
 * Entrées : serveur HTTP et options (delaiRetourMs : temps laissé à un joueur déconnecté pour revenir);
 * sortie : l'instance Socket.IO.
 */
function initialiserSocketServer(httpServer, { delaiRetourMs = 30_000 } = {}) {
	io = new Server(httpServer, {
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
				// Un joueur déconnecté qui revient à temps garde sa place
				if (socket.data.user) annulerDepart(room, socket.data.user.id);
				repondre({ salon: vuePourRole(salon.toObject(), role), role });
			} catch (err) {
				console.error(err);
				repondre({ error: "Erreur du serveur." });
			}
		});

		// Action de jeu (joueur ou dealer seulement). Le salon est celui du "join" : le client ne peut pas en viser un autre.
		socket.on("game:action", async ({ salonMaj } = {}) => {
			const { salonId, role } = socket.data;
			if (!salonId || (role !== "joueur" && role !== "dealer")) return;
			if (!salonMaj || typeof salonMaj !== "object") return;
			await diffuserTable(salonId, salonMaj);
		});

		// Le joueur quitte volontairement (le front l'a averti que sa main est perdue) : sa place est retirée tout de suite
		socket.on("leave", async (ack) => {
			const repondre = typeof ack === "function" ? ack : () => {};
			const { salonId, role, user } = socket.data;
			try {
				if (salonId && role === "joueur") {
					annulerDepart(salonId, user.id);
					await retirerJoueur(salonId, user.id);
				}
				if (salonId) socket.leave(salonId);
				socket.data.salonId = null;
				socket.data.role = null;
				repondre({ ok: true });
			} catch (err) {
				console.error(err);
				repondre({ error: "Erreur du serveur." });
			}
		});

		// Le dealer (créateur) ferme le salon depuis la table : mêmes règles que DELETE /deleteSalon
		socket.on("salon:close", async (ack) => {
			const repondre = typeof ack === "function" ? ack : () => {};
			const { salonId, role } = socket.data;
			if (!salonId || role !== "dealer") return repondre({ error: "Seul le dealer de ce salon peut le fermer." });
			try {
				const salon = await Salon.findById(salonId);
				if (!salon) return repondre({ error: "Salon introuvable." });
				if (salon.status === "playing") return repondre({ error: "Le salon ne peut pas être fermé pendant une partie." });
				await Salon.findByIdAndDelete(salonId);
				notifierSalonFerme(salonId);
				repondre({ ok: true });
			} catch (err) {
				console.error(err);
				repondre({ error: "Erreur du serveur." });
			}
		});

		// Image JPEG de la caméra, envoyée seulement par le dealer du salon
		socket.on("frame", (image) => {
			const { salonId, role } = socket.data;
			if (!salonId || role !== "dealer" || !Buffer.isBuffer(image)) return;
			socket.to(salonId).volatile.emit("frame", image); // joueurs / spectateurs
			io.to("detection").volatile.emit("frame", { salonId, image }); // service Python
		});

		// Joueur parti sans prévenir (onglet fermé, réseau, rafraîchissement) : il a delaiRetourMs pour revenir,
		// sinon sa place (et sa main) est retirée
		socket.on("disconnect", async () => {
			const { salonId, role, user } = socket.data;
			if (!salonId || role !== "joueur") return;
			const connexions = await io.in(salonId).fetchSockets();
			if (connexions.some((connexion) => String(connexion.data.user?.id) === String(user.id))) return; // un autre onglet est encore là
			annulerDepart(salonId, user.id);
			departs.set(`${salonId}:${user.id}`, setTimeout(() => {
				departs.delete(`${salonId}:${user.id}`);
				retirerJoueur(salonId, user.id).catch((err) => console.error(err));
			}, delaiRetourMs));
		});
	});

	return io;
}

module.exports = { initialiserSocketServer, notifierSalonFerme };
