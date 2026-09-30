import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Carte, CercleMise } from "./Blackjack.jsx";
import { DUREES_LIVE, JETONS, PHASES_LIVE, SIDE_BETS } from "./blackjackConstantes.js";
import "./Blackjack.css";
import "./LiveBlackjack.css";

const API_URL = "http://localhost:3000";
const VISION_URL = import.meta.env.VITE_VISION_URL ?? "http://localhost:8000";
const INTERVALLE_ACTUALISATION = 700;
const NOUVEL_ESSAI_VIDEO = 5000;

const NOMS_ACTIONS = {
	hit: { texte: "Tirer", icone: "fas fa-plus" },
	stand: { texte: "Rester", icone: "fas fa-hand-paper" },
	double: { texte: "Doubler", icone: "fas fa-angle-double-up" },
	split: { texte: "Séparer", icone: "fas fa-columns" },
};

const MISE_VIDE = { mise: 0, pairesParfaites: 0, vingtEtUnPlusTrois: 0 };

function argent(montant) {
	return `${Number(montant).toFixed(2)} $`;
}

function arrondir(montant) {
	return Math.round(montant * 100) / 100;
}

// Flux MJPEG du service de vision; réessaie tant qu'il est hors ligne
export function Video() {
	const [essai, setEssai] = useState(0);
	const [horsLigne, setHorsLigne] = useState(false);

	useEffect(() => {
		if (!horsLigne) return undefined;
		const minuterie = setTimeout(() => {
			setHorsLigne(false);
			setEssai((n) => n + 1);
		}, NOUVEL_ESSAI_VIDEO);
		return () => clearTimeout(minuterie);
	}, [horsLigne]);

	return horsLigne ? (
		<div className="live-video live-video-absente">
			<span className="icon is-large"><i className="fas fa-video-slash fa-2x" /></span>
			<p>Flux vidéo hors ligne</p>
		</div>
	) : (
		<img
			key={essai}
			className="live-video"
			src={`${VISION_URL}/video?essai=${essai}`}
			alt="Table de blackjack filmée en direct"
			onError={() => setHorsLigne(true)}
		/>
	);
}

export function Chrono({ table }) {
	if (table.restantMs === null) return null;
	const duree = DUREES_LIVE[table.phase] ?? table.restantMs;
	const part = Math.min(table.restantMs / duree, 1);
	return (
		<div className="live-chrono" aria-label={`${Math.ceil(table.restantMs / 1000)} secondes restantes`}>
			<div className={`live-chrono-barre ${part < 0.3 ? "is-urgent" : ""}`} style={{ width: `${part * 100}%` }} />
			<span>{Math.ceil(table.restantMs / 1000)} s</span>
		</div>
	);
}

function EtiquetteResultat({ main }) {
	if (!main.resultat) {
		if (main.statut === "bust") return <span className="tag is-danger is-small">Bust</span>;
		if (main.statut === "blackjack") return <span className="tag is-warning is-small">Blackjack</span>;
		return null;
	}
	const net = main.gain - main.mise;
	if (net > 0) return <span className="tag is-success is-small">+{argent(net)}</span>;
	if (net === 0) return <span className="tag is-light is-small">Égalité</span>;
	return <span className="tag is-danger is-small">{argent(net)}</span>;
}

export function Place({ index, place, table, peutSAsseoir, onSAsseoir }) {
	const active = table.active?.place === index;
	if (!place) {
		return (
			<div className="live-place live-place-libre">
				<p className="live-place-numero">Place {index + 1}</p>
				{peutSAsseoir ? (
					<button type="button" className="button is-small is-warning is-rounded" onClick={onSAsseoir}>
						Miser ici
					</button>
				) : (
					<p className="is-size-7 live-attenue">Libre</p>
				)}
			</div>
		);
	}
	const gainSideBets = place.sideBetsResultats.filter((sb) => sb.gain > 0);
	return (
		<div className={`live-place ${place.moi ? "is-moi" : ""} ${active ? "is-active" : ""}`}>
			<p className="live-place-numero">
				Place {index + 1} · <strong>{place.moi ? "Vous" : place.nom}</strong>
			</p>
			<p className="is-size-7 live-attenue">Mise {argent(place.mise)}</p>
			{place.mains.map((main, m) => (
				<div key={m} className={`live-main ${active && table.active.main === m ? "is-active" : ""}`}>
					<div className="bj-cartes live-cartes">
						{main.cartes.map((carte, i) => (
							<Carte key={i} carte={carte} delai={0} />
						))}
						{main.enAttente && <div className="live-carte-attendue" aria-label="Carte attendue" />}
					</div>
					<p className="is-size-7">
						{main.cartes.length > 0 && (main.statut === "blackjack" ? "BJ" : main.total)}
						{main.double && " · doublée"}
					</p>
					<EtiquetteResultat main={main} />
				</div>
			))}
			{gainSideBets.map((sb) => (
				<span key={sb.type} className="tag is-warning is-small mt-1">
					{SIDE_BETS[sb.type].court} : {sb.combinaison}
				</span>
			))}
		</div>
	);
}

function LiveBlackjack({ setIsLoggedIn }) {
	const [table, setTable] = useState(null);
	const [solde, setSolde] = useState(null);
	const [mise, setMise] = useState({ ...MISE_VIDE, mise: 10 });
	const [jetonChoisi, setJetonChoisi] = useState(10);
	const [message, setMessage] = useState("");
	const [chargement, setChargement] = useState(false);
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
				return false;
			}
			if (!response.ok) {
				setMessage(data.message || "Erreur du serveur");
				return false;
			}
			if (actif.current) {
				setTable(data.table);
				setSolde(data.solde);
			}
			return true;
		} catch {
			setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
			return false;
		}
	}

	// La table évolue sans nous (vision, autres joueurs, chronos) : on la relit en continu
	useEffect(() => {
		actif.current = true;
		const actualiser = () => appeler("/live/table");
		const premiere = setTimeout(actualiser, 0);
		const intervalle = setInterval(actualiser, INTERVALLE_ACTUALISATION);
		return () => {
			actif.current = false;
			clearTimeout(premiere);
			clearInterval(intervalle);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function envoyer(chemin, corps) {
		setMessage("");
		setChargement(true);
		await appeler(chemin, { method: "POST", body: JSON.stringify(corps ?? {}) });
		setChargement(false);
	}

	function sAsseoir(place) {
		envoyer("/live/miser", {
			place,
			mise: mise.mise,
			sideBets: { pairesParfaites: mise.pairesParfaites, vingtEtUnPlusTrois: mise.vingtEtUnPlusTrois },
		});
	}

	const totalMise = mise.mise + mise.pairesParfaites + mise.vingtEtUnPlusTrois;

	function ajouterJeton(zone) {
		let ajout = Math.min(jetonChoisi, (solde ?? 0) - totalMise);
		if (zone !== "mise") ajout = Math.min(ajout, mise.mise - mise[zone]);
		if (ajout <= 0) return;
		setMise((m) => ({ ...m, [zone]: arrondir(m[zone] + ajout) }));
	}

	if (!table) {
		return (
			<section className="section live-page">
				<p className="has-text-centered has-text-white">{message || "Connexion à la table…"}</p>
			</section>
		);
	}

	const maPlace = table.maPlace === null ? null : table.places[table.maPlace];
	const mainActive = maPlace && table.active?.place === table.maPlace ? maPlace.mains[table.active.main] : null;
	const erreurMise =
		mise.mise <= 0
			? "Posez un jeton sur la mise."
			: mise.pairesParfaites > mise.mise || mise.vingtEtUnPlusTrois > mise.mise
				? "Un side bet ne peut pas dépasser la mise."
				: solde !== null && totalMise > solde + 1e-9
					? "Le total des mises ne peut pas dépasser votre solde."
					: "";
	const peutSAsseoir = table.phase === "mises" && !maPlace && !erreurMise && !chargement;
	const bilan =
		maPlace && table.phase === "resultats"
			? maPlace.mains.reduce((t, m) => t + m.gain - m.mise, 0) +
				maPlace.sideBetsResultats.reduce((t, sb) => t + sb.gain - sb.mise, 0)
			: null;

	let panneau;
	if (table.actions.length > 0) {
		panneau = (
			<div className="has-text-centered">
				<p className="mb-2 has-text-weight-semibold">
					À vous de jouer · {mainActive.total}
				</p>
				<div className="buttons is-centered mb-0">
					{Object.entries(NOMS_ACTIONS).map(([action, { texte, icone }]) => (
						<button
							key={action}
							className="button is-warning is-light"
							onClick={() => envoyer("/live/action", { action })}
							disabled={chargement || !table.actions.includes(action)}
						>
							<span className="icon"><i className={icone} /></span>
							<span>{texte}</span>
						</button>
					))}
				</div>
			</div>
		);
	} else if (mainActive?.enAttente) {
		panneau = <p className="has-text-centered">Le croupier vous donne une carte…</p>;
	} else if (table.phase === "mises" && maPlace) {
		panneau = (
			<div className="has-text-centered">
				<p className="mb-2">
					Mise placée à la place {table.maPlace + 1} : {argent(maPlace.mise)}. Bonne chance !
				</p>
				<button className="button is-small is-light is-rounded" onClick={() => envoyer("/live/annuler")} disabled={chargement}>
					Annuler ma mise
				</button>
			</div>
		);
	} else if (table.phase === "mises") {
		panneau = (
			<div className="bj-barre-mise">
				<div className="bj-places">
					<div className="bj-place">
						<div className="bj-place-side">
							{Object.entries(SIDE_BETS).map(([type, { nom, court, paiements }]) => (
								<CercleMise
									key={type}
									petit
									nom={court}
									aide={`${nom} : ${paiements}`}
									montant={mise[type]}
									onAjouter={() => ajouterJeton(type)}
									onRetirer={() => setMise((m) => ({ ...m, [type]: 0 }))}
									desactive={chargement}
								/>
							))}
						</div>
						<CercleMise
							nom="Mise"
							montant={mise.mise}
							onAjouter={() => ajouterJeton("mise")}
							onRetirer={() => setMise((m) => ({ ...m, mise: 0 }))}
							desactive={chargement}
						/>
					</div>
				</div>
				<div className="bj-plateau-jetons" role="radiogroup" aria-label="Valeur du jeton">
					{JETONS.map((jeton) => (
						<button
							key={jeton}
							type="button"
							role="radio"
							aria-checked={jetonChoisi === jeton}
							aria-label={`Jeton de ${jeton}`}
							className={`bj-jeton bj-jeton-${jeton} ${jetonChoisi === jeton ? "is-choisi" : ""}`}
							onClick={() => setJetonChoisi(jeton)}
						>
							{jeton}
						</button>
					))}
				</div>
				<p className={`help ${erreurMise ? "has-text-warning" : "bj-astuce"}`}>
					{erreurMise || `Total ${argent(totalMise)} · cliquez sur « Miser ici » à une place libre`}
				</p>
			</div>
		);
	} else if (bilan !== null) {
		panneau = (
			<p className="has-text-centered is-size-5 has-text-weight-bold" role="status">
				{bilan > 0 ? `Vous gagnez ${argent(bilan)} !` : bilan < 0 ? `Vous perdez ${argent(-bilan)}.` : "Égalité : mises rendues."}
			</p>
		);
	} else {
		panneau = (
			<p className="has-text-centered live-attenue">
				{maPlace ? "En attente des autres joueurs…" : "Manche en cours · vous pourrez miser à la prochaine"}
			</p>
		);
	}

	return (
		<section className="section live-page">
			<div className="container">
				<div className="live-entete">
					<Link to="/" className="button is-small is-text bj-retour">
						<span className="icon"><i className="fas fa-arrow-left" /></span>
						<span>Tous les jeux</span>
					</Link>
					<div className="has-text-centered">
						<h1 className="title is-5 mb-0 has-text-white">
							<span className="live-pastille" /> Blackjack Live
						</h1>
						<p className="is-size-7 live-attenue">
							Blackjack paie 3:2 · Croupier reste sur 17 · Pas de carte cachée
						</p>
					</div>
					<span className="tag is-medium is-dark">
						<span className="icon"><i className="fas fa-coins" /></span>
						<span>{solde === null ? "--" : argent(solde)}</span>
					</span>
				</div>

				<div className="live-scene">
					<Video />
					<div className="live-bandeau">
						<span className="tag is-dark">Manche {table.manche}</span>
						<span className="tag is-warning">{PHASES_LIVE[table.phase]}</span>
						<Chrono table={table} />
					</div>
					{!table.visionConnectee && (
						<p className="live-alerte-vision">
							<i className="fas fa-exclamation-triangle" /> Reconnaissance des cartes hors ligne : la manche est en pause
						</p>
					)}
				</div>

				<div className="live-table">
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
							<Place
								key={index}
								index={index}
								place={place}
								table={table}
								peutSAsseoir={peutSAsseoir}
								onSAsseoir={() => sAsseoir(index)}
							/>
						))}
					</div>

					<div className="live-panneau">{panneau}</div>

					{message && (
						<p className="notification is-danger is-light mt-3 mb-0 py-2" role="alert">{message}</p>
					)}
				</div>
			</div>
		</section>
	);
}

export default LiveBlackjack;
