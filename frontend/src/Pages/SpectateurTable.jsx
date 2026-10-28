import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "./Blackjack.css";
import { API_URL, Carte } from "./reglesBlackjack/outils.js";

const LIBELLES_STATUT = { waiting: "En attente", playing: "En cours", finished: "Terminée" };
const LIBELLES_RESULTAT = { blackjack: "Blackjack", gagne: "Gagné", egalite: "Égalité · mise rendue", perdu: "Perdu" };
const CLASSES_RESULTAT = { blackjack: "is-success", gagne: "is-success", egalite: "is-light bj-egalite", perdu: "is-danger bj-perte" };

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
				const token = localStorage.getItem("token");
				let response = token
					? await fetch(`${API_URL}/spectateur/compte/salons/${id}`, {
							headers: { Authorization: `Bearer ${token}` },
						})
					: await fetch(`${API_URL}/spectateur/salons/${id}`);
				// Token expiré ou refusé : on retombe sur la vue invité
				if (token && (response.status === 401 || response.status === 403)) {
					response = await fetch(`${API_URL}/spectateur/salons/${id}`);
				}
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

	const formatArgent = (montant) => `${Number(montant).toFixed(2)} $`;

	return (
		<section className="section">
			<div className="container">
				<div className="level is-mobile mb-4">
					<div className="level-left"><div className="level-item">
						<Link to="/spectateur" className="button is-small is-text"><span className="icon"><i className="fas fa-arrow-left" /></span><span>Retour aux salons</span></Link>
					</div></div>
					<div className="level-right"><div className="level-item"><span className="tag is-medium is-dark"><span className="icon"><i className="fas fa-eye" /></span><span>Mode spectateur</span></span></div></div>
				</div>

				{message && <p className="notification is-danger is-light" role="alert">{message}</p>}
				{!salon && !message && <p className="has-text-centered">Chargement…</p>}

				{salon?.estMaTable && (
					<div className="notification is-info is-light has-text-centered">
						Vous jouez à cette table.{" "}
						<Link to="/jeux/blackjack">Retourner à la partie</Link>
					</div>
				)}

				{salon && <div className="bj-table">
					<div className="level is-mobile">
						<div className="level-left"><span className="tag is-dark">{LIBELLES_STATUT[salon.status] ?? salon.status}</span></div>
						<div className="level-right"><span className="tag is-dark">Salon {id}</span></div>
					</div>
					<h1 className="title has-text-centered">Blackjack</h1>
					<p className="subtitle is-6 has-text-centered">Le blackjack paie 3 pour 2 · Le croupier tire jusqu'à 17</p>

					<div className="bj-zone bj-zone-croupier mb-6">
						<p className="has-text-weight-semibold">Croupier · {salon.dealer_hand.total}</p>
						<div className="bj-cartes">{salon.dealer_hand.cartes.map((carte, index) => <Carte key={index} carte={carte} />)}</div>
					</div>

					<div className="bj-mains bj-zone-joueur">
						{salon.players.length === 0 && <p className="has-text-centered">Aucun joueur assis à cette table.</p>}
						{salon.players.map((joueur) => {
							const joueurLabel = joueur.nom ?? `Siège ${joueur.seat_index + 1}`;
							if (joueur.mains.length === 0) {
								return <div key={joueur.seat_index} className="bj-main"><p className="has-text-weight-semibold">{joueurLabel} · En attente · Mise {formatArgent(joueur.mise ?? 0)}</p></div>;
							}
							return joueur.mains.map((main, index) => (
								<div key={`${joueur.seat_index}-${index}`} className={`bj-main ${joueur.seat_index === salon.currentTurnSeat ? "is-active" : ""}`}>
									<div className="bj-cartes">{main.cartes.map((carte, carteIndex) => <Carte key={carteIndex} carte={carte} />)}</div>
									<p className="has-text-weight-semibold">{joueurLabel}{joueur.mains.length > 1 ? ` · Main ${index + 1}` : ""} · {main.total} · Mise {formatArgent(main.mise ?? 0)}</p>
									{main.resultat && <span className={`tag bj-resultat is-medium ${CLASSES_RESULTAT[main.resultat]}`}>{LIBELLES_RESULTAT[main.resultat]}</span>}
								</div>
							));
						})}
					</div>
				</div>}
			</div>
		</section>
	);
}

export default SpectateurTable;
