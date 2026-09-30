import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Carte } from "./Blackjack.jsx";
import { Chrono, Place, Video } from "./LiveBlackjack.jsx";
import { PHASES_LIVE } from "./blackjackConstantes.js";
import "./Blackjack.css";
import "./LiveBlackjack.css";
import "./Croupier.css";

const API_URL = "http://localhost:3000";
const INTERVALLE_ACTUALISATION = 700;

const RANGS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const COULEURS = {
	pique: { symbole: "♠", rouge: false },
	coeur: { symbole: "♥", rouge: true },
	carreau: { symbole: "♦", rouge: true },
	trefle: { symbole: "♣", rouge: false },
};

function nomZone(zone) {
	return zone === "croupier" ? "Croupier" : `Place ${zone + 1}`;
}

function SaisieManuelle({ table, occupe, onPoser }) {
	const [rang, setRang] = useState(null);
	const [couleur, setCouleur] = useState(null);
	const zone = table.zoneAttendue;

	function poser() {
		onPoser({ rang, couleur });
		setRang(null);
		setCouleur(null);
	}

	return (
		<div className="croupier-panneau">
			<h2 className="croupier-titre">Saisie manuelle</h2>
			<p className="is-size-7 live-attenue mb-2">
				Si la caméra ne lit pas une carte, saisissez-la ici : elle est donnée à la zone qui attend une carte.
			</p>
			<div className="croupier-rangs" role="radiogroup" aria-label="Rang">
				{RANGS.map((r) => (
					<button
						key={r}
						type="button"
						role="radio"
						aria-checked={rang === r}
						className={`button is-small ${rang === r ? "is-warning" : "is-dark"}`}
						onClick={() => setRang(r)}
					>
						{r}
					</button>
				))}
			</div>
			<div className="croupier-couleurs" role="radiogroup" aria-label="Couleur">
				{Object.entries(COULEURS).map(([nom, { symbole, rouge }]) => (
					<button
						key={nom}
						type="button"
						role="radio"
						aria-checked={couleur === nom}
						aria-label={nom}
						className={`button ${couleur === nom ? "is-warning" : "is-light"} ${rouge ? "croupier-rouge" : ""}`}
						onClick={() => setCouleur(nom)}
					>
						{symbole}
					</button>
				))}
			</div>
			<button
				type="button"
				className="button is-warning is-fullwidth mt-2"
				disabled={occupe || zone === null || !rang || !couleur}
				onClick={poser}
			>
				{zone === null
					? "Aucune carte attendue"
					: `Poser ${rang ?? "?"}${couleur ? COULEURS[couleur].symbole : "?"} → ${nomZone(zone)}`}
			</button>
		</div>
	);
}

function Croupier({ setIsLoggedIn }) {
	const [table, setTable] = useState(null);
	const [message, setMessage] = useState("");
	const [chargement, setChargement] = useState(false);
	const [confirmerAnnulation, setConfirmerAnnulation] = useState(false);
	const actif = useRef(true);

	async function appeler(chemin, options = {}) {
		try {
			const response = await fetch(`${API_URL}${chemin}`, {
				...options,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});
			const data = await response.json();
			if (response.status === 401) {
				localStorage.removeItem("token");
				setIsLoggedIn(false);
				return;
			}
			if (!response.ok) {
				setMessage(data.message || "Erreur du serveur");
				return;
			}
			if (actif.current) setTable(data.table);
		} catch {
			setMessage("Impossible de joindre le serveur.");
		}
	}

	useEffect(() => {
		actif.current = true;
		const actualiser = () => appeler("/live/croupier");
		const premiere = setTimeout(actualiser, 0);
		const intervalle = setInterval(actualiser, INTERVALLE_ACTUALISATION);
		return () => {
			actif.current = false;
			clearTimeout(premiere);
			clearInterval(intervalle);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function commande(chemin, corps) {
		setMessage("");
		setChargement(true);
		await appeler(`/live/croupier/${chemin}`, { method: "POST", body: JSON.stringify(corps ?? {}) });
		setChargement(false);
	}

	if (!table) {
		return (
			<section className="section live-page">
				<p className="has-text-centered">{message || "Connexion à la table…"}</p>
			</section>
		);
	}

	const joueurs = table.places.filter(Boolean);
	const misesTotales = joueurs.reduce(
		(total, place) =>
			total +
			(place.mains.length ? place.mains.reduce((t, main) => t + main.mise, 0) : place.mise) +
			Object.values(place.sideBets).reduce((t, montant) => t + montant, 0),
		0,
	);
	const mancheAnnulable = !["resultats", "nettoyage"].includes(table.phase) && joueurs.length > 0;

	return (
		<section className="section live-page">
			<div className="container is-fluid">
				<div className="live-entete">
					<Link to="/jeux/live" className="button is-small is-text bj-retour">
						<span className="icon"><i className="fas fa-eye" /></span>
						<span>Vue joueur</span>
					</Link>
					<h1 className="title is-5 mb-0 has-text-white">
						<span className="live-pastille" /> Console croupier · Manche {table.manche}
					</h1>
					<span className={`tag is-medium ${table.visionConnectee ? "is-success" : "is-danger"}`}>
						<span className="icon"><i className={`fas ${table.visionConnectee ? "fa-video" : "fa-video-slash"}`} /></span>
						<span>{table.visionConnectee ? "Vision en ligne" : "Vision hors ligne"}</span>
					</span>
				</div>

				<div className="croupier-grille">
					<div className="croupier-video">
						<Video />
					</div>

					<div className="croupier-colonne">
						<div className={`croupier-consigne croupier-phase-${table.phase}`} role="status">
							<div className="croupier-consigne-haut">
								<span className="tag is-dark">{PHASES_LIVE[table.phase]}</span>
								<Chrono table={table} />
							</div>
							<p className="croupier-instruction">{table.instructionCroupier}</p>
							{table.zoneAttendue !== null && (
								<p className="croupier-zone">
									<i className="fas fa-hand-point-right" /> {nomZone(table.zoneAttendue)}
								</p>
							)}
						</div>

						<div className="croupier-panneau">
							<h2 className="croupier-titre">Commandes</h2>
							<div className="buttons mb-0">
								<button
									className="button is-info"
									disabled={chargement || table.phase !== "mises" || joueurs.length === 0}
									onClick={() => commande("fermer-mises")}
								>
									<span className="icon"><i className="fas fa-lock" /></span>
									<span>Fermer les mises</span>
								</button>
								<button
									className="button is-success"
									disabled={chargement || table.phase !== "nettoyage"}
									onClick={() => commande("table-vide")}
									title="À utiliser si la caméra ne voit pas que la table est vide"
								>
									<span className="icon"><i className="fas fa-broom" /></span>
									<span>Table ramassée</span>
								</button>
								{confirmerAnnulation ? (
									<>
										<button
											className="button is-danger"
											disabled={chargement}
											onClick={() => {
												setConfirmerAnnulation(false);
												commande("annuler-manche");
											}}
										>
											Confirmer : rembourser {misesTotales.toFixed(2)} $
										</button>
										<button className="button is-dark" onClick={() => setConfirmerAnnulation(false)}>
											Garder la manche
										</button>
									</>
								) : (
									<button
										className="button is-danger is-outlined"
										disabled={chargement || !mancheAnnulable}
										onClick={() => setConfirmerAnnulation(true)}
										title="Fausse donne : toutes les mises de la manche sont rendues"
									>
										<span className="icon"><i className="fas fa-ban" /></span>
										<span>Annuler la manche</span>
									</button>
								)}
							</div>
							{message && <p className="notification is-danger is-light mt-2 mb-0 py-2" role="alert">{message}</p>}
						</div>

						<SaisieManuelle table={table} occupe={chargement} onPoser={(carte) => commande("carte", carte)} />

						<div className="croupier-panneau">
							<h2 className="croupier-titre">Journal</h2>
							{table.alertes.length ? (
								<ul className="croupier-journal">
									{table.alertes.map((alerte, i) => (
										<li key={i}>{alerte}</li>
									))}
								</ul>
							) : (
								<p className="is-size-7 live-attenue">Rien à signaler.</p>
							)}
						</div>
					</div>
				</div>

				<div className="live-table croupier-table">
					<div className="bj-zone bj-zone-croupier">
						<p className="has-text-weight-semibold">
							Croupier
							{table.croupier.cartes.length > 0 &&
								` · ${table.croupier.blackjack ? "Blackjack" : table.croupier.total}`}
						</p>
						<div className="bj-cartes live-cartes">
							{table.croupier.cartes.map((carte, i) => (
								<Carte key={i} carte={carte} delai={0} />
							))}
							{table.zoneAttendue === "croupier" && <div className="live-carte-attendue" />}
						</div>
					</div>
					<div className="live-places bj-zone-joueur">
						{table.places.map((place, index) => (
							<Place key={index} index={index} place={place} table={table} peutSAsseoir={false} />
						))}
					</div>
					<p className="has-text-centered is-size-7 live-attenue mt-2">
						{joueurs.length} joueur{joueurs.length > 1 ? "s" : ""} · {misesTotales.toFixed(2)} $ en jeu
					</p>
				</div>
			</div>
		</section>
	);
}

export default Croupier;
