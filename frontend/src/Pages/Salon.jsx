import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Blackjack from "./Blackjack.jsx";
import {
	API_URL,
	idSalon,
	lireUtilisateur,
	normaliserSalon,
} from "./reglesBlackjack/outils.js";

function memeIdentifiant(premier, second) {
	return premier != null && second != null && String(premier) === String(second);
}

function Salon({ setIsLoggedIn, setIsSpectateur, isSpectateur }) {
	const navigate = useNavigate();
	const utilisateur = lireUtilisateur();
	const idUtilisateur = utilisateur.id ?? utilisateur._id;
	const role = utilisateur.role?.toLowerCase();
	const estDealer = role === "dealer" || role === "admin";
	const [salon, setSalon] = useState(null);
	const [salons, setSalons] = useState([]);
	const [chargement, setChargement] = useState(false);
	const [message, setMessage] = useState("");

	// Le lobby est en HTTP seulement : la connexion Socket.IO (et le "join") appartient à la table
	useEffect(() => {
		appeler(isSpectateur ? "/spectateur/salons" : "/salons");
	}, [isSpectateur]);

	async function appeler(chemin, options = {}) {
		setMessage("");
		setChargement(true);
		try {
			const estModeSpectateur = Boolean(isSpectateur || chemin === "/spectateur/salons" || (!localStorage.getItem("token") && chemin === "/salons"));
			const cheminFinal = chemin === "/salons" && estModeSpectateur ? "/spectateur/salons" : chemin;
			const headers = { "Content-Type": "application/json" };
			const token = localStorage.getItem("token");
			if (!estModeSpectateur && token) {
				headers.Authorization = `Bearer ${token}`;
			}
			const response = await fetch(`${API_URL}${cheminFinal}`, {
				...options,
				headers,
			});
			const data = await response.json();
			if (response.status === 401 && !estModeSpectateur) {
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
	}

	async function creerSalon() {
		const data = await appeler("/createSalon", { method: "POST", body: JSON.stringify({}) });
		if (data?.salon) {
			const salonNormalise = normaliserSalon(data.salon);
			setSalon(salonNormalise);
			await appeler("/salons");
		}
	}

	async function retourAuxSalons() {
		setSalon(null);
		await appeler("/salons");
	}

	async function fermerSalon(salonAfermer) {
		if (!window.confirm("Voulez-vous fermer ce salon ?")) return;
		const data = await appeler("/deleteSalon", {
			method: "DELETE",
			body: JSON.stringify({ salonId: idSalon(salonAfermer) }),
		});
		if (data) await appeler("/salons");
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
			const siegeAleatoire = siegesLibres[Math.floor(Math.random() * siegesLibres.length)];
			data = await appeler("/addPlayer", {
				method: "POST",
				body: JSON.stringify({ salonId: idS, seat_index: siegeAleatoire }),
			});
		}

		if (data?.salon) {
			const salonNormalise = normaliserSalon(data.salon);
			setSalon(salonNormalise);
			await appeler("/salons");
		}
	}

	if (salon) {
		return <Blackjack salon={salon} setSalon={setSalon} setIsLoggedIn={setIsLoggedIn} isSpectateur={isSpectateur} retourAuxSalons={retourAuxSalons} />;
	}

	return (
		<section className="section">
			<div className="container">
				<div className="level is-mobile" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2.2rem" }}>
					<h1 className="title is-2 mb-0">Salons de blackjack</h1>
				</div>

				{salons.length === 0 ? (
					<div className="box has-text-centered" style={{ border: "1px solid #d6d6d6" }}>
						<p className="has-text-grey">Aucun salon ouvert pour le moment.</p>
					</div>
				) : (
					<div className="columns is-multiline">
						{salons.map((salonDisponible) => {
							const placesLibres = Math.max(0, 6 - salonDisponible.players.length);
							const estCreateur = salonDisponible.created_by === utilisateur.id;
							const joueurExistant = salonDisponible.players.some((player) => memeIdentifiant(player.id_compte, idUtilisateur));
							const boutonAction = isSpectateur ? (
								<button
									className="button is-warning is-fullwidth"
									onClick={() => navigate(`/spectateur/${idSalon(salonDisponible)}`)}
									disabled={chargement}
								>   <span className="icon is-small mr-2"><i className="fas fa-eye" /></span>
									Regarder en mode spectateur
								</button>
							) : estDealer ? estCreateur && (
								<button
									className="button is-danger is-fullwidth"
									onClick={() => fermerSalon(salonDisponible)}
									disabled={chargement || salonDisponible.status === "playing"}
									aria-label={`Fermer le salon ${idSalon(salonDisponible)}`}
								>
									Fermer
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
									<button
										className="button is-light"
										style={{ flex: "0 0 15%", minWidth: 0, width: "15%", paddingLeft: "0.35rem", paddingRight: "0.35rem" }}
										onClick={() => {
											setIsSpectateur(true);
											navigate("/spectateur");
										}}
										disabled={chargement}
										aria-label="Regarder le salon"
									>
										<span className="icon is-small"><i className="fas fa-eye" /></span>
									</button>
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

				{message && <p className="notification is-danger is-light mt-4 mb-0" role="alert">{message}</p>}
			</div>
		</section>
	);
}

export default Salon;
