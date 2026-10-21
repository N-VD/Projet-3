import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "./Blackjack.css";
import { API_URL, Carte } from "./reglesBlackjack/outils.js";

const LIBELLES_STATUT = { waiting: "En attente", playing: "En cours", finished: "Terminée" };

/** Entrée : aucune (id lu dans l'URL); sortie : le JSX de la table regardée. */
function SpectateurTable() {
	const { id } = useParams();
	const [salon, setSalon] = useState(null);
	const [message, setMessage] = useState("");

	useEffect(() => {
		let actif = true;

		/** Entrée : aucune; sortie : Promise qui met à jour la vue du salon. */
		async function chargerSalon() {
			try {
				const response = await fetch(`${API_URL}/spectateur/salons/${id}`);
				const data = await response.json();
				if (!actif) return;
				if (!response.ok) {
					setMessage(data.message || "Erreur du serveur.");
					setSalon(null);
					return;
				}
				setSalon(data);
				setMessage("");
			} catch {
				if (actif) setMessage("Impossible de joindre le serveur.");
			}
		}

		chargerSalon();
		const intervalle = window.setInterval(chargerSalon, 2000);
		return () => {
			actif = false;
			window.clearInterval(intervalle);
		};
	}, [id]);

	return (
		<section className="section">
			<Link className="button is-light mb-4" to="/spectateur">← Retour aux salons</Link>
			{message && <p className="notification is-danger">{message}</p>}
			{!salon && !message && <p className="has-text-centered">Chargement…</p>}
			{salon && (
				<>
					<h1 className="title is-3 has-text-centered">
						Partie : {LIBELLES_STATUT[salon.status] ?? salon.status}
					</h1>

					<div className="box has-text-centered">
						<h2 className="title is-5">Croupier ({salon.dealer_hand.total})</h2>
						<div className="is-flex is-justify-content-center" style={{ gap: "0.5rem" }}>
							{salon.dealer_hand.cartes.map((carte, index) => (
								<Carte key={index} carte={carte} />
							))}
						</div>
					</div>

					{salon.players.length === 0 && (
						<p className="has-text-centered">Aucun joueur assis à cette table.</p>
					)}
					<div className="columns is-multiline is-centered">
						{salon.players.map((joueur) => (
							<div className="column is-one-quarter" key={joueur.seat_index}>
								<div
									className={`box has-text-centered ${
										joueur.seat_index === salon.currentTurnSeat ? "has-background-primary-light" : ""
									}`}
								>
									<h2 className="title is-6">
										Siège {joueur.seat_index + 1}
										{joueur.seat_index === salon.currentTurnSeat && " — à son tour"}
									</h2>
									<div className="is-flex is-justify-content-center" style={{ gap: "0.5rem" }}>
										{joueur.cartes.map((carte, index) => (
											<Carte key={index} carte={carte} />
										))}
									</div>
									<p className="mt-2">Total : {joueur.total}</p>
									<p>Mise : {joueur.mise} $</p>
								</div>
							</div>
						))}
					</div>
				</>
			)}
		</section>
	);
}

export default SpectateurTable;
