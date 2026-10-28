import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "./reglesBlackjack/outils.js";

const LIBELLES_STATUT = { waiting: "En attente", playing: "En cours" };

/** Entrée : aucune; sortie : le JSX de la liste des salons à regarder. */
function Spectateur() {
	const [salons, setSalons] = useState([]);
	const [message, setMessage] = useState("");
	const [chargement, setChargement] = useState(true);

	useEffect(() => {
		/** Entrée : aucune; sortie : Promise qui met à jour la liste des salons. */
		async function chargerSalons() {
			try {
				const response = await fetch(`${API_URL}/spectateur/salons`);
				const data = await response.json();
				if (!response.ok) {
					setMessage(data.message || "Erreur du serveur.");
					return;
				}
				setSalons(data.salons);
				setMessage("");
			} catch {
				setMessage("Impossible de joindre le serveur.");
			} finally {
				setChargement(false);
			}
		}

		chargerSalons();
		const intervalle = window.setInterval(chargerSalons, 5000);
		return () => window.clearInterval(intervalle);
	}, []);

	return (
		<section className="section">
			<h1 className="title is-2 has-text-centered">Mode spectateur</h1>
			{message && <p className="notification is-danger">{message}</p>}
			{chargement && <p className="has-text-centered">Chargement…</p>}
			{!chargement && !message && salons.length === 0 && (
				<p className="has-text-centered">Aucun salon ouvert pour le moment.</p>
			)}
			<div className="columns is-multiline">
				{salons.map((salon, index) => (
					<div className="column is-one-third" key={salon._id}>
						<div className="box">
							<h2 className="title is-5">Salon {index + 1}</h2>
							<p>Statut : {LIBELLES_STATUT[salon.status] ?? salon.status}</p>
							<p>Joueurs : {salon.players.length}</p>
							<Link className="button is-primary mt-3" to={`/spectateur/${salon._id}`}>
								Regarder
							</Link>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

export default Spectateur;
