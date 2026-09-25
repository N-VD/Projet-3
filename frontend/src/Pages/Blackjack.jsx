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
		// Nouvelle main : ordre réel de distribution (joueur, croupier, joueur, croupier)
		plan.manche = mancheActuelle + 1;
		for (let i = 0; i < 2; i++) {
			distribuer(plan.mains[0], i);
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

function Blackjack({ isLoggedIn, setIsLoggedIn }) {
	const [partie, setPartie] = useState(null);
	const [solde, setSolde] = useState(null);
	const [mise, setMise] = useState(10);
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
				const finDeMain = data.partie.statut === "terminee";
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
		appeler("/blackjack/miser", { method: "POST", body: JSON.stringify({ mise: Number(mise) }) });
	}

	function jouer(action) {
		appeler("/blackjack/action", { method: "POST", body: JSON.stringify({ action }) });
	}

	const enCours = partie?.statut === "en_cours";
	const terminee = partie?.statut === "terminee";
	const occupe = chargement || enAnimation;
	const miseNombre = Number(mise);
	const peutMiser = solde !== null && solde > 0;
	const erreurMise =
		!Number.isFinite(miseNombre) || miseNombre <= 0
			? "La mise doit être supérieure à zéro."
			: solde !== null && miseNombre > solde
				? "La mise ne peut pas dépasser votre solde."
				: "";
	const bilan = terminee ? partie.mains.reduce((total, main) => total + main.gain - main.mise, 0) : 0;

	return (
		<div>
			<section className="section">
				<div className="container">
					<div className="level is-mobile mb-4">
						<div className="level-left">
							<div className="level-item">
								<Link to="/" className="button is-small is-text">
									<span className="icon"><i className="fas fa-arrow-left" /></span>
									<span>Tous les jeux</span>
								</Link>
							</div>
						</div>
						<div className="level-right">
							<div className="level-item">
								<span className="tag is-medium is-dark">
									<span className="icon"><i className="fas fa-coins" /></span>
									<span>Solde : {solde === null ? "--" : argent(solde)}</span>
								</span>
							</div>
						</div>
					</div>

					<div className="bj-table">
						<h1 className="title has-text-centered">Blackjack</h1>
						<p className="subtitle is-6 has-text-centered">
							Le blackjack paie 3 pour 2 · Le croupier tire jusqu'à 17
						</p>

						<div className="bj-sabot" aria-hidden="true">
							<div className="bj-sabot-carte" />
							<div className="bj-sabot-carte" />
							<div className="bj-sabot-carte" />
						</div>

						{partie && (
							<div key={plan?.manche ?? 0}>
								<div className="bj-zone bj-zone-croupier mb-6">
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
											<p className="has-text-weight-semibold">
												{partie.mains.length > 1 && `Main ${index + 1} · `}
												{enAnimation ? "…" : main.statut === "blackjack" ? "Blackjack" : main.total} · Mise {argent(main.mise)}
												{main.double && " (doublée)"}
											</p>
											{!enAnimation && <EtiquetteMain main={main} terminee={terminee} />}
										</div>
									))}
								</div>
							</div>
						)}

						{!partie && (
							<p className="has-text-centered my-6">Placez votre mise pour commencer une main.</p>
						)}

						{terminee && !enAnimation && (
							<p className="has-text-centered is-size-5 has-text-weight-bold mt-5 bj-resultat" role="status">
								{bilan > 0 ? `Vous gagnez ${argent(bilan)} !` : bilan < 0 ? `Vous perdez ${argent(-bilan)}.` : "Égalité : vous récupérez votre mise."}
							</p>
						)}

						<div className="mt-5">
							{enCours || enAnimation ? (
								<div className="buttons is-centered">
									{Object.entries(NOMS_ACTIONS).map(([action, { texte, icone }]) => (
										<button
											key={action}
											className="button is-light is-medium"
											onClick={() => jouer(action)}
											disabled={occupe || !partie.actions.includes(action)}
										>
											<span className="icon"><i className={icone} /></span>
											<span>{texte}</span>
										</button>
									))}
								</div>
							) : (
								<form onSubmit={miser} className="has-text-centered">
									{peutMiser ? (
										<>
											<div className="buttons is-centered mb-2">
												{JETONS.map((jeton) => (
													<button
														key={jeton}
														type="button"
														className="button is-rounded is-warning is-light"
														onClick={() => setMise((m) => Math.min(Number(m || 0) + jeton, solde))}
														disabled={chargement}
													>
														+{jeton}
													</button>
												))}
												<button type="button" className="button is-rounded is-danger is-light" onClick={() => setMise(solde)} disabled={chargement}>
													Tout miser
												</button>
												<button type="button" className="button is-rounded is-light" onClick={() => setMise(0)} disabled={chargement}>
													Effacer
												</button>
											</div>
											<div className="field has-addons has-addons-centered">
												<div className="control has-icons-left">
													<input
														className={`input ${erreurMise ? "is-danger" : ""}`}
														type="number"
														min="0.01"
														step="0.01"
														max={solde ?? undefined}
														value={mise}
														onChange={(e) => setMise(e.target.value)}
														aria-label="Montant de la mise"
													/>
													<span className="icon is-small is-left"><i className="fas fa-coins" /></span>
												</div>
												<div className="control">
													<button className="button is-warning" type="submit" disabled={chargement || Boolean(erreurMise)}>
														{terminee ? "Nouvelle main" : "Distribuer"}
													</button>
												</div>
											</div>
											{erreurMise && <p className="help has-text-warning">{erreurMise}</p>}
										</>
									) : (
										solde !== null && (
											<p>
												Votre solde est vide : vous ne pouvez plus miser.{" "}
												<Link to="/dashboard" className="has-text-warning">Gérer mon compte</Link>
											</p>
										)
									)}
								</form>
							)}
						</div>

						{message && (
							<p className="notification is-danger is-light mt-4 mb-0" role="alert">{message}</p>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}

export default Blackjack;
