import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Blackjack.css";

const API_URL = "http://localhost:3000";
const JETONS = [5, 10, 25, 100];
const SYMBOLES = { pique: "♠", coeur: "♥", carreau: "♦", trefle: "♣" };
const NOMS_ACTIONS = {
	hit: { texte: "Tirer", icone: "fas fa-plus" },
	stand: { texte: "Rester", icone: "fas fa-hand-paper" },
	double: { texte: "Doubler", icone: "fas fa-angle-double-up" },
	split: { texte: "Séparer", icone: "fas fa-columns" },
};

const SIDE_BETS = {
	pairesParfaites: {
		nom: "Paires parfaites",
		court: "PP",
		paiements: "Paire parfaite 25:1 · De couleur 12:1 · Mixte 6:1",
	},
	vingtEtUnPlusTrois: {
		nom: "21+3",
		court: "21+3",
		paiements: "Brelan assorti 100:1 · Quinte flush 40:1 · Brelan 30:1 · Suite 10:1 · Couleur 5:1",
	},
};

const NB_PLACES_MAX = 3;
const PLACE_VIDE = { mise: 0, pairesParfaites: 0, vingtEtUnPlusTrois: 0 };

function argent(montant) {
	return `${Number(montant).toFixed(2)} $`;
}

// Durées des animations (en secondes)
const PAS_DISTRIBUTION = 0.3;
const DUREE_DISTRIBUTION = 0.45;
const DUREE_RETOURNEMENT = 0.6;

function mouvementReduit() {
	return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function memeCarte(a, b) {
	return a && b && !a.cachee && a.rang === b.rang && a.couleur === b.couleur;
}

// Calcule quand chaque nouvelle carte doit arriver (délai en secondes, null = déjà sur la table)
function planifierAnimations(ancienne, nouvelle, mancheActuelle) {
	const plan = {
		mains: nouvelle.mains.map((main) => main.cartes.map(() => null)),
		croupier: nouvelle.croupier.cartes.map(() => null),
		retournement: null,
		manche: mancheActuelle,
	};
	let t = 0;
	const distribuer = (liste, index) => {
		if (index < liste.length && liste[index] === null) {
			liste[index] = t;
			t += PAS_DISTRIBUTION;
		}
	};

	if (!ancienne || ancienne.statut === "terminee") {
		// Nouvelle main : ordre réel de distribution (chaque place puis le croupier, deux fois)
		plan.manche = mancheActuelle + 1;
		for (let i = 0; i < 2; i++) {
			plan.mains.forEach((liste) => distribuer(liste, i));
			distribuer(plan.croupier, i);
		}
		// Cartes restantes (ex. partie rechargée après un split)
		plan.mains.forEach((liste) => liste.forEach((_, i) => distribuer(liste, i)));
		plan.croupier.forEach((_, i) => distribuer(plan.croupier, i));
	} else {
		// Cartes tirées par le joueur (hit, double, split)
		nouvelle.mains.forEach((main, m) =>
			main.cartes.forEach((carte, c) => {
				if (!memeCarte(ancienne.mains[m]?.cartes[c], carte)) distribuer(plan.mains[m], c);
			}),
		);
		// Le croupier révèle sa carte cachée avant de tirer
		if (ancienne.croupier.cartes[1]?.cachee && !nouvelle.croupier.cartes[1]?.cachee) {
			plan.retournement = t;
			t += DUREE_RETOURNEMENT;
		}
		nouvelle.croupier.cartes.forEach((_, i) => {
			if (i >= ancienne.croupier.cartes.length) distribuer(plan.croupier, i);
		});
	}

	plan.duree = mouvementReduit() || t === 0 ? 0 : t + DUREE_DISTRIBUTION;
	return plan;
}

function Carte({ carte, delai = null, retournement = null }) {
	const symbole = SYMBOLES[carte.couleur];
	const rouge = carte.couleur === "coeur" || carte.couleur === "carreau";
	const style = {
		"--delai": `${delai ?? 0}s`,
		"--delai-retournement": `${retournement ?? 0}s`,
	};
	return (
		<div
			className={`bj-carte ${delai !== null ? "bj-distribuee" : ""} ${carte.cachee ? "est-cachee" : ""}`}
			style={style}
			aria-label={carte.cachee ? "Carte cachée" : `${carte.rang} de ${carte.couleur}`}
		>
			<div className="bj-carte-interieur">
				<div className={`bj-face bj-recto ${rouge ? "bj-rouge" : ""}`}>
					{!carte.cachee && (
						<>
							<span className="bj-coin">{carte.rang}<br />{symbole}</span>
							<span className="bj-centre">{symbole}</span>
							<span className="bj-coin bj-bas">{carte.rang}<br />{symbole}</span>
						</>
					)}
				</div>
				<div className="bj-face bj-verso" />
			</div>
		</div>
	);
}

function EtiquetteMain({ main, terminee }) {
	if (terminee) {
		const net = main.gain - main.mise;
		switch (main.resultat) {
			case "blackjack":
				return <span className="tag bj-resultat is-warning is-medium">Blackjack ! +{argent(net)}</span>;
			case "gagne":
				return <span className="tag bj-resultat is-success is-medium">Gagné +{argent(net)}</span>;
			case "egalite":
				return <span className="tag bj-resultat is-light is-medium">Égalité — mise remboursée</span>;
			default:
				return (
					<span className="tag bj-resultat bj-perte is-danger is-medium">
						{main.statut === "bust" ? "Bust" : "Perdu"} −{argent(main.mise)}
					</span>
				);
		}
	}
	if (main.statut === "bust") return <span className="tag bj-resultat bj-perte is-danger is-medium">Bust — perdu</span>;
	if (main.statut === "blackjack") return <span className="tag bj-resultat is-warning is-medium">Blackjack !</span>;
	return null;
}

// Décompose un montant en jetons (du plus gros au plus petit) pour l'afficher en pile
function decomposerEnJetons(montant) {
	const jetons = [];
	let reste = Math.floor(montant);
	for (const jeton of [...JETONS].reverse()) {
		while (reste >= jeton) {
			jetons.push(jeton);
			reste -= jeton;
		}
	}
	return jetons;
}

const PILE_MAX = 6;

function CercleMise({ nom, aide, montant, petit = false, onAjouter, onRetirer, desactive }) {
	const pile = decomposerEnJetons(montant).slice(0, PILE_MAX).reverse();
	return (
		<div className="bj-zone-mise">
			<button
				type="button"
				className={`bj-cercle ${petit ? "bj-cercle-petit" : ""}`}
				onClick={onAjouter}
				disabled={desactive}
				title={aide}
				aria-label={`Ajouter le jeton à : ${nom} (actuellement ${argent(montant)})`}
			>
				<span className="bj-cercle-nom">{nom}</span>
				<span className="bj-pile" aria-hidden="true">
					{pile.map((jeton, i) => (
						<span key={i} className={`bj-jeton bj-jeton-${jeton} bj-jeton-empile`} style={{ "--rang": i }}>
							{jeton}
						</span>
					))}
				</span>
				{montant > 0 && <span className="bj-cercle-montant">{argent(montant)}</span>}
			</button>
			{montant > 0 && (
				<button
					type="button"
					className="bj-retirer"
					onClick={onRetirer}
					disabled={desactive}
					aria-label={`Retirer la mise : ${nom}`}
					title="Retirer"
				>
					×
				</button>
			)}
		</div>
	);
}

// Une place à la table : mise principale + ses deux side bets
function PlaceMise({ index, place, multiple, onAjouter, onRetirer, onSupprimer, desactive }) {
	return (
		<div className="bj-place">
			{multiple && (
				<p className="bj-place-titre">
					Main {index + 1}
					<button
						type="button"
						className="bj-supprimer-place"
						onClick={onSupprimer}
						disabled={desactive}
						aria-label={`Retirer la main ${index + 1}`}
						title="Retirer cette main"
					>
						<i className="fas fa-times" />
					</button>
				</p>
			)}
			<div className="bj-place-side">
				{Object.entries(SIDE_BETS).map(([type, { nom, court, paiements }]) => (
					<CercleMise
						key={type}
						petit
						nom={court}
						aide={`${nom} : ${paiements}`}
						montant={place[type]}
						onAjouter={() => onAjouter(type)}
						onRetirer={() => onRetirer(type)}
						desactive={desactive}
					/>
				))}
			</div>
			<CercleMise
				nom="Mise"
				montant={place.mise}
				onAjouter={() => onAjouter("mise")}
				onRetirer={() => onRetirer("mise")}
				desactive={desactive}
			/>
		</div>
	);
}

function ResultatsSideBets({ sideBets, multiple }) {
	if (!sideBets?.length) return null;
	return (
		<div className="tags is-centered mb-2">
			{sideBets.map((sb) => {
				const prefixe = `${multiple ? `Main ${sb.place + 1} · ` : ""}${SIDE_BETS[sb.type].nom}`;
				return sb.gain > 0 ? (
					<span key={`${sb.place}-${sb.type}`} className="tag is-warning">
						{prefixe} : {sb.combinaison} ({sb.paiement}:1) +{argent(sb.gain - sb.mise)}
					</span>
				) : (
					<span key={`${sb.place}-${sb.type}`} className="tag is-dark">
						{prefixe} : perdu −{argent(sb.mise)}
					</span>
				);
			})}
		</div>
	);
}

// Nom affiché d'une main : sa place à la table et, après un split, son numéro dans la place
function nomMain(partie, index) {
	const main = partie.mains[index];
	const nbPlaces = new Set(partie.mains.map((m) => m.place)).size;
	const memePlace = partie.mains.filter((m) => m.place === main.place);
	const parties = [];
	if (nbPlaces > 1) parties.push(`Main ${main.place + 1}`);
	if (memePlace.length > 1) parties.push(`${memePlace.indexOf(main) + 1}/${memePlace.length}`);
	return parties.join(" · ");
}

function Blackjack({ setIsLoggedIn }) {
	const [partie, setPartie] = useState(null);
	const [solde, setSolde] = useState(null);
	const [places, setPlaces] = useState([{ ...PLACE_VIDE, mise: 10 }]);
	const [jetonChoisi, setJetonChoisi] = useState(10);
	const [message, setMessage] = useState("");
	const [chargement, setChargement] = useState(false);
	const [plan, setPlan] = useState(null);
	const [enAnimation, setEnAnimation] = useState(false);
	const minuterie = useRef(null);

	useEffect(() => () => clearTimeout(minuterie.current), []);

	async function appeler(chemin, options = {}) {
		setMessage("");
		setChargement(true);
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
				// Session expirée : retour à la connexion
				localStorage.removeItem("token");
				setIsLoggedIn(false);
				return;
			}
			if (!response.ok) {
				setMessage(data.message || "Erreur du serveur");
				return;
			}
			const nouveauPlan = data.partie ? planifierAnimations(partie, data.partie, plan?.manche ?? 0) : null;
			setPlan(nouveauPlan);
			setPartie(data.partie);

			// Les gains ne sont crédités à l'écran qu'une fois les cartes révélées
			clearTimeout(minuterie.current);
			if (nouveauPlan?.duree) {
				setEnAnimation(true);
				// Un side bet gagnant ne doit pas être dévoilé par le solde avant la fin de la distribution
				const nouvelleDonne = !partie || partie.statut === "terminee";
				const finDeMain =
					data.partie.statut === "terminee" || (nouvelleDonne && data.partie.sideBets.some((sb) => sb.gain > 0));
				if (!finDeMain) setSolde(data.solde);
				minuterie.current = setTimeout(() => {
					setEnAnimation(false);
					if (finDeMain) setSolde(data.solde);
				}, nouveauPlan.duree * 1000);
			} else {
				setEnAnimation(false);
				setSolde(data.solde);
			}
		} catch {
			setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
		} finally {
			setChargement(false);
		}
	}

	useEffect(() => {
		appeler("/blackjack/partie");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function miser(event) {
		event.preventDefault();
		appeler("/blackjack/miser", {
			method: "POST",
			body: JSON.stringify({
				places: places.map((place) => ({
					mise: place.mise,
					sideBets: { pairesParfaites: place.pairesParfaites, vingtEtUnPlusTrois: place.vingtEtUnPlusTrois },
				})),
			}),
		});
	}

	function jouer(action) {
		appeler("/blackjack/action", { method: "POST", body: JSON.stringify({ action }) });
	}

	const enCours = partie?.statut === "en_cours";
	const terminee = partie?.statut === "terminee";
	const occupe = chargement || enAnimation;
	const peutMiser = solde !== null && solde > 0;
	const totalPlace = (place) => place.mise + place.pairesParfaites + place.vingtEtUnPlusTrois;
	const totalMise = places.reduce((total, place) => total + totalPlace(place), 0);
	const erreurMise = places.some((place) => place.mise <= 0)
		? places.length > 1
			? "Chaque main doit avoir une mise."
			: "Posez un jeton sur la mise pour jouer."
		: places.some((place) => place.pairesParfaites > place.mise || place.vingtEtUnPlusTrois > place.mise)
			? "Un side bet ne peut pas dépasser la mise de sa main."
			: solde !== null && totalMise > solde + 1e-9
				? "Le total des mises ne peut pas dépasser votre solde."
				: "";
	const bilan = terminee
		? partie.mains.reduce((total, main) => total + main.gain - main.mise, 0) +
			partie.sideBets.reduce((total, sb) => total + sb.gain - sb.mise, 0)
		: 0;
	const plusieursPlaces = partie ? new Set(partie.mains.map((m) => m.place)).size > 1 : false;

	const arrondir = (montant) => Math.round(montant * 100) / 100;

	// Pose le jeton choisi sur une zone, sans dépasser le solde ni (pour un side bet) la mise de la main
	function ajouterJeton(index, zone) {
		const place = places[index];
		let ajout = Math.min(jetonChoisi, (solde ?? 0) - totalMise);
		if (zone !== "mise") ajout = Math.min(ajout, place.mise - place[zone]);
		if (ajout <= 0) return;
		setPlaces((liste) => liste.map((p, i) => (i === index ? { ...p, [zone]: arrondir(p[zone] + ajout) } : p)));
	}

	function viderZone(index, zone) {
		setPlaces((liste) => liste.map((p, i) => (i === index ? { ...p, [zone]: 0 } : p)));
	}

	function ajouterPlace() {
		setPlaces((liste) => (liste.length < NB_PLACES_MAX ? [...liste, { ...PLACE_VIDE }] : liste));
	}

	function supprimerPlace(index) {
		setPlaces((liste) => (liste.length > 1 ? liste.filter((_, i) => i !== index) : liste));
	}

	// Répartit tout le solde restant (hors side bets) entre les mises principales
	function toutMiser() {
		const sideBets = places.reduce((total, p) => total + p.pairesParfaites + p.vingtEtUnPlusTrois, 0);
		const parPlace = Math.floor(((solde ?? 0) - sideBets) / places.length * 100) / 100;
		setPlaces((liste) => liste.map((p) => ({ ...p, mise: Math.max(parPlace, 0) })));
	}

	function toutEffacer() {
		setPlaces((liste) => liste.map(() => ({ ...PLACE_VIDE })));
	}

	const zoneMises = peutMiser ? (
		<form onSubmit={miser} className="bj-barre-mise">
			<div className="bj-places">
				{places.map((place, index) => (
					<PlaceMise
						key={index}
						index={index}
						place={place}
						multiple={places.length > 1}
						onAjouter={(zone) => ajouterJeton(index, zone)}
						onRetirer={(zone) => viderZone(index, zone)}
						onSupprimer={() => supprimerPlace(index)}
						desactive={chargement}
					/>
				))}
				{places.length < NB_PLACES_MAX && (
					<button type="button" className="bj-ajouter-place" onClick={ajouterPlace} disabled={chargement}>
						<span className="icon"><i className="fas fa-plus" /></span>
						<span>Ajouter une main</span>
					</button>
				)}
			</div>

			<div className="bj-commandes">
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
							disabled={chargement}
						>
							{jeton}
						</button>
					))}
				</div>
				<div className="buttons mb-0">
					<button type="button" className="button is-small is-rounded is-danger is-light mb-0" onClick={toutMiser} disabled={chargement}>
						Tout miser
					</button>
					<button type="button" className="button is-small is-rounded is-light mb-0" onClick={toutEffacer} disabled={chargement}>
						Effacer
					</button>
					<button className="button is-rounded is-warning mb-0" type="submit" disabled={chargement || Boolean(erreurMise)}>
						{terminee ? "Nouvelle donne" : "Distribuer"} · {argent(totalMise)}
					</button>
				</div>
			</div>
			<p className={`help ${erreurMise ? "has-text-warning" : "bj-astuce"}`}>
				{erreurMise || "Choisissez un jeton puis cliquez sur un cercle · survolez PP / 21+3 pour voir les paiements"}
			</p>
		</form>
	) : (
		solde !== null && (
			<p className="has-text-centered">
				Votre solde est vide : vous ne pouvez plus miser.{" "}
				<Link to="/dashboard" className="has-text-warning">Gérer mon compte</Link>
			</p>
		)
	);

	return (
		<section className="section bj-page">
			<div className="container">
				<div className="bj-table">
					<div className="bj-entete">
						<Link to="/" className="button is-small is-text bj-retour">
							<span className="icon"><i className="fas fa-arrow-left" /></span>
							<span>Tous les jeux</span>
						</Link>
						<div className="has-text-centered">
							<h1 className="title is-5 mb-0">Blackjack</h1>
							<p className="is-size-7 bj-regles">Blackjack paie 3:2 · Le croupier tire jusqu'à 17</p>
						</div>
						<span className="tag is-medium is-dark">
							<span className="icon"><i className="fas fa-coins" /></span>
							<span>{solde === null ? "--" : argent(solde)}</span>
						</span>
					</div>

					<div className="bj-sabot" aria-hidden="true">
						<div className="bj-sabot-carte" />
						<div className="bj-sabot-carte" />
						<div className="bj-sabot-carte" />
					</div>

					{partie ? (
						<div key={plan?.manche ?? 0}>
							<div className="bj-zone bj-zone-croupier">
								<p className="has-text-weight-semibold">
									Croupier · {enAnimation ? "…" : partie.croupier.blackjack ? "Blackjack" : partie.croupier.total}
								</p>
								<div className="bj-cartes">
									{partie.croupier.cartes.map((carte, index) => (
										<Carte
											key={index}
											carte={carte}
											delai={plan?.croupier[index] ?? null}
											retournement={index === 1 ? plan?.retournement : null}
										/>
									))}
								</div>
							</div>

							<div className="bj-milieu">
								{!enAnimation && <ResultatsSideBets sideBets={partie.sideBets} multiple={plusieursPlaces} />}
								{terminee && !enAnimation && (
									<p className="is-size-5 has-text-weight-bold bj-resultat" role="status">
										{bilan > 0 ? `Vous gagnez ${argent(bilan)} !` : bilan < 0 ? `Vous perdez ${argent(-bilan)}.` : "Égalité : vous récupérez vos mises."}
									</p>
								)}
							</div>

							<div className="bj-mains bj-zone-joueur">
								{partie.mains.map((main, index) => (
									<div key={index} className={`bj-main ${partie.mainActive === index ? "is-active" : ""}`}>
										<div className="bj-cartes">
											{main.cartes.map((carte, i) => (
												<Carte
													key={`${i}-${carte.rang}-${carte.couleur}`}
													carte={carte}
													delai={plan?.mains[index]?.[i] ?? null}
												/>
											))}
										</div>
										<p className="has-text-weight-semibold is-size-7-mobile">
											{nomMain(partie, index) && `${nomMain(partie, index)} · `}
											{enAnimation ? "…" : main.statut === "blackjack" ? "Blackjack" : main.total} · {argent(main.mise)}
											{main.double && " (doublée)"}
										</p>
										{!enAnimation && <EtiquetteMain main={main} terminee={terminee} />}
									</div>
								))}
							</div>
						</div>
					) : (
						<p className="has-text-centered my-4">Placez vos mises pour commencer une donne.</p>
					)}

					<div className="mt-3">
						{enCours || enAnimation ? (
							<div className="buttons is-centered mb-0">
								{Object.entries(NOMS_ACTIONS).map(([action, { texte, icone }]) => (
									<button
										key={action}
										className="button is-light"
										onClick={() => jouer(action)}
										disabled={occupe || !partie.actions.includes(action)}
									>
										<span className="icon"><i className={icone} /></span>
										<span>{texte}</span>
									</button>
								))}
							</div>
						) : (
							zoneMises
						)}
					</div>

					{message && (
						<p className="notification is-danger is-light mt-3 mb-0 py-2" role="alert">{message}</p>
					)}
				</div>
			</div>
		</section>
	);
}

export default Blackjack;
