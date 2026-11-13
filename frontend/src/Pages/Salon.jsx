import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
	API_URL,
	idSalon,
	lireUtilisateur,
} from "./reglesBlackjack/outils.js";

function memeIdentifiant(premier, second) {
	return premier != null && second != null && String(premier) === String(second);
}

/** Entrée : sièges libres; sortie : l'un d'eux au hasard. Hors du composant : Math.random y est interdit par le lint. */
function siegeAuHasard(siegesLibres) {
	return siegesLibres[Math.floor(Math.random() * siegesLibres.length)];
}

/** Entrées : chemin de l'API et options fetch; sortie : { response, data, token }. Aucun état React ici. */
async function envoyer(chemin, options = {}) {
	// /salons accepte les invités : le token n'est envoyé que si on en a un
	const headers = { "Content-Type": "application/json" };
	const token = localStorage.getItem("token");
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	const response = await fetch(`${API_URL}${chemin}`, {
		...options,
		headers,
	});
	const data = await response.json();
	return { response, data, token };
}

function Salon({ setIsLoggedIn }) {
	const navigate = useNavigate();
	const location = useLocation();
	// ex. « Ce salon a été fermé. » quand la table nous renvoie ici (copié en état pour pouvoir le fermer)
	const [avis, setAvis] = useState(() => location.state?.message);
	const utilisateur = lireUtilisateur();
	const idUtilisateur = utilisateur.id ?? utilisateur._id;
	const role = utilisateur.role?.toLowerCase();
	const estDealer = role === "dealer" || role === "admin";
	const estConnecte = Boolean(localStorage.getItem("token")); // sinon invité : il peut seulement regarder
	const [salons, setSalons] = useState([]);
	const [chargement, setChargement] = useState(false);
	const [message, setMessage] = useState("");

	async function appeler(chemin, options = {}) {
		setMessage("");
		setChargement(true);
		try {
			const { response, data, token } = await envoyer(chemin, options);
			if (response.status === 401 && token) {
				localStorage.removeItem("token");
				setIsLoggedIn(false);
				return null;
			}
			if (!response.ok) {
				setMessage(data.message || "Erreur du serveur.");
				return null;
			}
			if (data.salons) setSalons(data.salons);
			return data;
		} catch {
			setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
			return null;
		} finally {
			setChargement(false);
		}
	};

	// Le lobby est en HTTP seulement : la connexion Socket.IO (et le "join") appartient à la table
	// Premier chargement : les états sont modifiés dans le .then, pas directement dans l'effet (règle du lint)
	useEffect(() => {
		let annule = false; // le composant a été démonté avant la réponse
		envoyer("/salons")
			.then(({ response, data, token }) => {
				if (annule) return;
				if (response.status === 401 && token) {
					localStorage.removeItem("token");
					setIsLoggedIn(false);
				} else if (!response.ok) {
					setMessage(data.message || "Erreur du serveur.");
				} else if (data.salons) {
					setSalons(data.salons);
				}
			})
			.catch(() => {
				if (!annule) setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
			});
		return () => {
			annule = true;
		};
	}, [setIsLoggedIn]);

	/** Entrée : id du salon; ouvre sa table (le rôle dealer / joueur / spectateur est décidé par le socket). */
	function ouvrirTable(salonId) {
		navigate(`/jeux/blackjack-camera/${salonId}`);
	}

	async function creerSalon() {
		const data = await appeler("/createSalon", { method: "POST", body: JSON.stringify({}) });
		if (data?.salon) ouvrirTable(idSalon(data.salon));
	}

	async function rejoindreSalon(salonChoisi) {
		const idS = idSalon(salonChoisi);
		const joueurExistant = salonChoisi.players.find((player) => memeIdentifiant(player.id_compte, idUtilisateur));

		let data;
		if (joueurExistant) {
			data = await appeler("/addPlayer", {
				method: "POST",
				body: JSON.stringify({ salonId: idS, seat_index: joueurExistant.seat_index }),
			});
		} else {
			const siegesOccupes = new Set(salonChoisi.players.map((player) => player.seat_index));
			const siegesLibres = Array.from({ length: 6 }, (_, index) => index)
				.filter((index) => !siegesOccupes.has(index));
			if (siegesLibres.length === 0) {
				setMessage("Ce salon est complet.");
				await appeler("/salons");
				return;
			}
			const siegeAleatoire = siegeAuHasard(siegesLibres);
			data = await appeler("/addPlayer", {
				method: "POST",
				body: JSON.stringify({ salonId: idS, seat_index: siegeAleatoire }),
			});
		}

		if (data?.salon) ouvrirTable(idS);
	}

	return (
		<section
			className="section"
			style={{
				backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url('/background.jpg')",
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundRepeat: "no-repeat",
				minHeight: "100vh",
			}}
		>
			<div className="container">
				<div className="level is-mobile" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2.2rem" }}>
					<h1 className="title is-2 mb-0">Salons de blackjack</h1>
				</div>

				{avis && <div className="notification is-warning is-light mt-4 mb-8" role="status">
					<button
						className="delete"
						aria-label="Fermer la notification"
						onClick={() => {
							setAvis(null);
							navigate(location.pathname, { replace: true, state: null }); // ne revient pas après un rafraîchissement
						}}
					/>
					{avis}
				</div>}
				{message && <div className="notification is-danger is-light mt-4 mb-8" role="alert">
					<button className="delete" aria-label="Fermer la notification" onClick={() => setMessage("")} />
					{message}
				</div>}

				{salons.length === 0 ? (
					<div className="box has-text-centered" style={{ border: "1px solid #d6d6d6" }}>
						<p className="has-text-grey">Aucun salon ouvert pour le moment.</p>
					</div>
				) : (
					<div className="columns is-multiline">
						{salons.map((salonDisponible) => {
							const placesLibres = Math.max(0, 6 - salonDisponible.players.length);
							const estCreateur = memeIdentifiant(salonDisponible.created_by, idUtilisateur);
							const joueurExistant = salonDisponible.players.some((player) => memeIdentifiant(player.id_compte, idUtilisateur));
							const boutonRegarder = (
								<button
									className="button is-light"
									style={{ flex: "0 0 15%", minWidth: 0, width: "15%", paddingLeft: "0.35rem", paddingRight: "0.35rem" }}
									onClick={() => ouvrirTable(idSalon(salonDisponible))}
									disabled={chargement}
									aria-label="Regarder le salon"
								>
									<span className="icon is-small"><i className="fas fa-eye" /></span>
								</button>
							);
							// Invité, ou dealer qui n'a pas créé ce salon : il peut seulement regarder
							const boutonAction = !estConnecte || (estDealer && !estCreateur) ? (
								<button
									className="button is-warning is-fullwidth"
									onClick={() => ouvrirTable(idSalon(salonDisponible))}
									disabled={chargement}
								>   <span className="icon is-small mr-2"><i className="fas fa-eye" /></span>
									Regarder
								</button>
							) : estDealer ? (
								// Son salon : il l'ouvre pour filmer (la fermeture se fait depuis la table)
								<button
									className="button is-warning is-fullwidth"
									onClick={() => ouvrirTable(idSalon(salonDisponible))}
									disabled={chargement}
								>   <span className="icon is-small mr-2"><i className="fas fa-video" /></span>
									Ouvrir ma table
								</button>
							) : (
								<div className="buttons is-centered" style={{ marginBottom: 0, display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: "0.5rem", width: "100%", alignItems: "stretch" }}>
									<button
										className="button is-warning"
										style={{ flex: "0 0 85%", minWidth: 0, width: "85%" }}
										onClick={() => rejoindreSalon(salonDisponible)}
										disabled={chargement || (!joueurExistant && (salonDisponible.status !== "waiting" || placesLibres === 0))}
									>
										{joueurExistant ? "Revenir au salon" : "Jouer"}
									</button>
									{boutonRegarder}
								</div>
							);

							return (
								<div key={idSalon(salonDisponible)} className="column is-one-third-desktop is-half-tablet is-full-mobile" style={{ display: "flex" }}>
									<div className="card" style={{ height: "100%", minHeight: "300px", width: "100%", marginBottom: 0, border: "1px solid #d6d6d6", borderRadius: "14px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column" }}>
										<header className="card-header" style={{ background: "linear-gradient(90deg, #0f7a3b 0%, #1ca35c 50%, #0d5f2d 100%)", borderRadius: "14px 14px 0 0" }}>
											<p className="card-header-title">Salon {idSalon(salonDisponible).slice(-6)}</p>
										</header>
										<div className="card-content" style={{ padding: "1.2rem 1.2rem 0.8rem", flex: "1 1 auto" }}>
											<div className="content" style={{ marginBottom: 0 }}>
												<p style={{ marginBottom: "0.6rem" }}><strong>État :</strong> {salonDisponible.status === "playing" ? "En cours" : "En attente"}</p>
												<p style={{ marginBottom: "0.6rem" }}><strong>Joueurs :</strong> {salonDisponible.players.length} / 6</p>
												<p style={{ marginBottom: 0 }}><strong>Places libres :</strong> {placesLibres}</p>
											</div>
										</div>
										<footer className="card-footer" style={{ background: "linear-gradient(90deg, #0f7a3b 0%, #1ca35c 50%, #0d5f2d 100%)", padding: "0.75rem", borderRadius: "0 0 14px 14px", marginTop: "auto" }}>
											<div style={{ width: "100%" }}>{boutonAction}</div>
										</footer>
									</div>
								</div>
							);
						})}
					</div>
				)}

				<div className="buttons is-centered" style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
					{estDealer && (
						<button
							className="button is-warning"
							onClick={creerSalon}
							disabled={chargement}
						>
							<span className="icon"><i className="fas fa-plus" /></span>
							<span>Créer un salon</span>
						</button>
					)}
					<button
						className="button is-light"
						onClick={() => appeler("/salons")}
						disabled={chargement}
						aria-label="Actualiser les salons"
					>
						<span className="icon"><i className="fas fa-sync-alt" /></span>
						<span>Rafraîchir</span>
					</button>
				</div>
			</div>
		</section>
	);
}

export default Salon;
