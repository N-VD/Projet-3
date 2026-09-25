import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Blackjack.css";
import {
	API_URL,
	Carte,
	idSalon,
	lireUtilisateur,
	mainsJoueur,
	melangerSabot,
	normaliserSalon,
	planifierAnimations,
	SIEGE_INACTIF,
	totalMain,
} from "./reglesBlackjack/outils.js";

/** Entrée : le callback setIsLoggedIn; sortie : le JSX de la page Blackjack. */
function Blackjack({ setIsLoggedIn }) {
	const utilisateur = lireUtilisateur();
	const role = utilisateur.role?.toLowerCase();
	const estDealer = role === "dealer" || role === "admin";
	const [salon, setSalon] = useState(null);
	const [salons, setSalons] = useState([]);
	const [mise, setMise] = useState(10);
	const [solde, setSolde] = useState(null);
	const [sabot, setSabot] = useState([]);
	const [resultats, setResultats] = useState({});
	const [message, setMessage] = useState("");
	const [chargement, setChargement] = useState(false);
	const [compteRebours, setCompteRebours] = useState(null);
	const lancementAutomatique = useRef(null);
	const minuterieAnimation = useRef(null);
	const [planAnimation, setPlanAnimation] = useState(null);
	const [enAnimation, setEnAnimation] = useState(false);

	useEffect(() => () => window.clearTimeout(minuterieAnimation.current), []);

	useEffect(() => {
		const token = localStorage.getItem("token");
		fetch(`${API_URL}/solde`, { headers: { Authorization: `Bearer ${token}` } })
			.then(async (response) => {
				const data = await response.json();
				if (response.status === 401) {
					localStorage.removeItem("token");
					setIsLoggedIn(false);
					return;
				}
				if (response.ok) setSolde(data.solde);
			})
			.catch(() => {});
	}, [setIsLoggedIn]);

	useEffect(() => {
		appeler("/salons");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/** Entrées : chemin API et options fetch; sortie : Promise contenant les données JSON ou null en cas d’échec. */
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

	/** Entrée : aucune; sortie : Promise résolue après la création et la sélection d’un salon. */
	async function creerSalon() {
		const data = await appeler("/createSalon", { method: "POST", body: JSON.stringify({}) });
		if (data?.salon) setSalon(normaliserSalon(data.salon));
	}

	/** Entrée : salon choisi; sortie : Promise résolue après la tentative de rejoindre une place aléatoire. */
	async function rejoindreSalon(salonChoisi) {
		const siegesOccupes = new Set(salonChoisi.players.map((player) => player.seat_index));
		const siegesLibres = Array.from({ length: 6 }, (_, index) => index)
			.filter((index) => !siegesOccupes.has(index));
		if (siegesLibres.length === 0) {
			setMessage("Ce salon est complet.");
			await appeler("/salons");
			return;
		}
		const siegeAleatoire = siegesLibres[Math.floor(Math.random() * siegesLibres.length)];
		const data = await appeler("/addPlayer", {
			method: "POST",
			body: JSON.stringify({ salonId: idSalon(salonChoisi), seat_index: siegeAleatoire }),
		});
		if (data?.salon) {
			setSalon(normaliserSalon(data.salon));
			await appeler("/salons");
		}
	}

	/** Entrée : état du salon; sortie : objet JSON au format attendu par /gameStatus. */
	function payloadSalon(etat) {
		return {
			salonId: etat.salonId,
			status: etat.status,
			dealer_hand: etat.dealer_hand,
			players: etat.players.map((player) => ({
				id_compte: player.id_compte,
				seat_index: player.seat_index,
				hand: player.hand ?? [],
				hands: player.hands ?? [],
				activeHand: player.activeHand ?? 0,
				bet: player.bet ?? 0,
				status: player.status ?? "waiting",
				isTurn: Boolean(player.isTurn),
			})),
			currentTurnSeat: etat.currentTurnSeat ?? SIEGE_INACTIF,
		};
	}

	/** Entrées : état du salon, sabot et résultats; sortie : Promise<boolean> indiquant si la sauvegarde a réussi. */
	async function sauvegarder(etat, nextDeck = sabot, prochainsResultats = resultats) {
		const data = await appeler("/gameStatus", {
			method: "PATCH",
			body: JSON.stringify(payloadSalon(etat)),
		});
		if (!data?.gameStatus) return false;
		const salonMisAJour = { ...salon, ...data.gameStatus, salonId: salon.salonId };
		const nouveauPlan = planifierAnimations(salon, salonMisAJour);
		setSalon(salonMisAJour);
		if (data.solde !== undefined && data.solde !== null) setSolde(data.solde);
		setSabot(nextDeck);
		setResultats(prochainsResultats);
		window.clearTimeout(minuterieAnimation.current);
		if (nouveauPlan.duree > 0) {
			setPlanAnimation(nouveauPlan);
			setEnAnimation(true);
			minuterieAnimation.current = window.setTimeout(() => {
				setPlanAnimation(null);
				setEnAnimation(false);
			}, nouveauPlan.duree * 1000);
		} else {
			setPlanAnimation(null);
			setEnAnimation(false);
		}
		return true;
	}

	/** Entrée : événement de soumission; sortie : Promise résolue après l’enregistrement de la mise. */
	async function placerMise(event) {
		event.preventDefault();
		if (!salon || !Number.isFinite(Number(mise)) || Number(mise) <= 0) return;
		if (solde !== null && Number(mise) > solde) {
			setMessage("La mise ne peut pas dépasser votre solde.");
			return;
		}
		const players = salon.players.map((player) => player.id_compte === utilisateur.id
			? { ...player, bet: Number(mise) }
			: player);
		await sauvegarder({ ...salon, players, currentTurnSeat: SIEGE_INACTIF });
	}

	/** Entrée : aucune; sortie : aucune valeur; distribue les cartes et sauvegarde la manche. */
	function distribuer() {
		if (!salon) return;
		if (!salon.players.some((player) => player.bet > 0)) {
			setMessage("Un joueur doit placer une mise avant le début de la manche.");
			return;
		}
		const cartes = melangerSabot();
		const players = salon.players.map((player) => {
			if (player.bet <= 0) return { ...player, hand: [], hands: [], activeHand: 0, status: "waiting", isTurn: false };
			const hand = [cartes.pop(), cartes.pop()];
			const naturel = totalMain(hand) === 21;
			return {
				...player,
				hand,
				hands: [{ cartes: hand, mise: player.bet, status: naturel ? "blackjack" : "playing", naturel }],
				activeHand: 0,
				status: naturel ? "blackjack" : "playing",
				isTurn: false,
			};
		});
		const dealerHand = [cartes.pop(), cartes.pop()];
		const premier = players.find((player) => player.status === "playing");
		const prochain = premier?.seat_index ?? SIEGE_INACTIF;
		const etat = {
			...salon,
			status: "playing",
			dealer_hand: dealerHand,
			players: players.map((player) => ({ ...player, isTurn: player.seat_index === prochain })),
			currentTurnSeat: prochain,
		};
		setSabot(cartes);
		setResultats({});
		if (!premier) terminer(etat, cartes, {});
		else sauvegarder(etat, cartes, {});
	}

	/** Entrées : état de manche, cartes restantes et résultats; sortie : Promise résolue après règlement et retour à l’attente. */
	async function terminer(etat, cartesRestantes, resultatsActuels) {
		const players = etat.players.map((player) => ({ ...player, isTurn: false }));
		const joueursRestants = players.some((player) => mainsJoueur(player).some((main) => ["playing", "stand", "blackjack"].includes(main.status)));
		let dealerHand = [...etat.dealer_hand];
		if (joueursRestants) {
			while (totalMain(dealerHand) < 17 && cartesRestantes.length) dealerHand.push(cartesRestantes.pop());
		}
		const totalCroupier = totalMain(dealerHand);
		const blackjackCroupier = dealerHand.length === 2 && totalCroupier === 21;
		const prochainsResultats = { ...resultatsActuels };
		for (const player of players) {
			if (player.bet <= 0) continue;
			prochainsResultats[player.seat_index] = mainsJoueur(player).map((main) => {
				const totalJoueur = totalMain(main.cartes);
				if (totalJoueur > 21) return "perdu";
				if (main.naturel && blackjackCroupier) return "egalite";
				if (main.naturel) return "blackjack";
				if (blackjackCroupier) return "perdu";
				if (totalCroupier > 21 || totalJoueur > totalCroupier) return "gagne";
				if (totalJoueur === totalCroupier) return "egalite";
				return "perdu";
			});
		}
		const partieTerminee = {
			...etat,
			status: "finished",
			dealer_hand: dealerHand,
			players: players.map((player) => ({ ...player, status: player.bet > 0 ? "finished" : "waiting", isTurn: false })),
			currentTurnSeat: SIEGE_INACTIF,
		};
		if (!await sauvegarder(partieTerminee, cartesRestantes, prochainsResultats)) return;
		const attenteMises = {
			...partieTerminee,
			status: "waiting",
			players: partieTerminee.players.map((player) => ({ ...player, bet: 0, status: "waiting", isTurn: false, activeHand: 0 })),
		};
		await sauvegarder(attenteMises, cartesRestantes, prochainsResultats);
	}

	/** Entrée : action hit, stand ou split; sortie : Promise résolue après l’action et l’avancement du tour. */
	async function actionJoueur(action) {
		if (!salon || !monJoueur?.isTurn || !["hit", "stand", "split"].includes(action)) return;
		const cards = [...sabot];
		let players = salon.players.map((player) => ({
			...player,
			hands: mainsJoueur(player).map((main) => ({ ...main, cartes: [...main.cartes] })),
		}));
		const joueur = players.find((player) => player.id_compte === utilisateur.id);
		const mains = joueur.hands;
		const activeHand = joueur.activeHand ?? 0;
		const main = mains[activeHand];
		if (!main || main.status !== "playing") return;

		if (action === "split") {
			if (main.cartes.length !== 2 || main.cartes[0].rang !== main.cartes[1].rang || mains.length >= 4) return;
			const [premiere, seconde] = main.cartes;
			const separerAs = premiere.rang === "A";
			const mainGauche = {
				cartes: [premiere, cards.pop()],
				mise: main.mise,
				status: separerAs ? "stand" : "playing",
				naturel: false,
			};
			const mainDroite = {
				cartes: [seconde, cards.pop()],
				mise: main.mise,
				status: separerAs ? "stand" : "playing",
				naturel: false,
			};
			mains.splice(activeHand, 1, mainGauche, mainDroite);
		} else if (action === "hit") {
			main.cartes.push(cards.pop());
			if (totalMain(main.cartes) > 21) main.status = "bust";
			else if (totalMain(main.cartes) === 21) main.status = "stand";
		} else {
			main.status = "stand";
		}

		joueur.hand = mains[0]?.cartes ?? [];
		joueur.status = mains.some((entry) => entry.status === "playing") ? "playing" : "stand";
		const autreMain = mains.findIndex((entry, index) => index > activeHand && entry.status === "playing");
		let prochainJoueur = null;
		let prochainIndexMain = -1;
		if (mains[activeHand]?.status === "playing") {
			prochainJoueur = joueur;
			prochainIndexMain = activeHand;
		} else if (autreMain >= 0) {
			prochainJoueur = joueur;
			prochainIndexMain = autreMain;
		} else {
			const autresJoueurs = players
				.filter((player) => player.seat_index !== joueur.seat_index && player.hands.some((entry) => entry.status === "playing"))
				.sort((a, b) => (a.seat_index - joueur.seat_index + 6) % 6 - (b.seat_index - joueur.seat_index + 6) % 6);
			prochainJoueur = autresJoueurs[0] ?? null;
			if (prochainJoueur) prochainIndexMain = prochainJoueur.hands.findIndex((entry) => entry.status === "playing");
		}

		if (prochainJoueur) prochainJoueur.activeHand = prochainIndexMain;
		const currentTurnSeat = prochainJoueur?.seat_index ?? SIEGE_INACTIF;
		players = players.map((player) => ({ ...player, isTurn: player.seat_index === currentTurnSeat }));
		const etat = { ...salon, players, currentTurnSeat };
		if (!prochainJoueur) await terminer(etat, cards, resultats);
		else await sauvegarder(etat, cards, resultats);
	}

	/** Entrée : aucune; sortie : Promise résolue après la mise à jour du salon et le retour à la liste. */
	async function quitterSalon() {
		if (!salon) return;
		const joueur = salon.players.find((player) => player.id_compte === utilisateur.id);

		if (salon.status === "waiting" && joueur) {
			const joueurs = salon.players
				.filter((player) => player.id_compte !== utilisateur.id)
				.map((player) => ({ ...player, isTurn: false }));
			const etat = { ...salon, players: joueurs, currentTurnSeat: SIEGE_INACTIF };
			if (!await sauvegarder(etat)) return;
		} else if (salon.status === "playing" && joueur) {
			const joueurs = salon.players.map((player) => (
				player.id_compte === utilisateur.id && player.status === "playing"
					? { ...player, status: "stand", isTurn: false }
					: { ...player }
			));
			const prochain = joueurs
				.filter((player) => player.status === "playing")
				.sort((a, b) => a.seat_index - b.seat_index)[0];
			const currentTurnSeat = prochain?.seat_index ?? SIEGE_INACTIF;
			const etat = {
				...salon,
				players: joueurs.map((player) => ({ ...player, isTurn: player.seat_index === currentTurnSeat })),
				currentTurnSeat,
			};
			if (prochain) {
				if (!await sauvegarder(etat)) return;
			} else {
				await terminer(etat, sabot, resultats);
			}
		} else {
			setMessage("Votre place dans le salon est introuvable.");
			return;
		}

		setSalon(null);
		await appeler("/salons");
	}

	lancementAutomatique.current = distribuer;

	useEffect(() => {
		const joueursEnAttente = salon?.status === "waiting" && salon.players.some((player) => player.bet > 0);
		if (!joueursEnAttente) {
			setCompteRebours(null);
			return undefined;
		}

		const duree = 10_000;
		const depart = Date.now();
		setCompteRebours(10);
		const intervalle = window.setInterval(() => {
			setCompteRebours(Math.max(0, Math.ceil((duree - (Date.now() - depart)) / 1000)));
		}, 250);
		const minuterie = window.setTimeout(() => {
			setCompteRebours(null);
			lancementAutomatique.current?.();
		}, duree);

		return () => {
			window.clearInterval(intervalle);
			window.clearTimeout(minuterie);
		};
	}, [salon?.salonId, salon?.status, salon?.players]);

	const monJoueur = salon?.players.find((player) => player.id_compte === utilisateur.id);
	const enAttente = salon?.status === "waiting";
	const monTour = salon?.status === "playing" && monJoueur?.isTurn;
	const mainsDuJoueur = monJoueur ? mainsJoueur(monJoueur) : [];
	const mainActiveJoueur = mainsDuJoueur[monJoueur?.activeHand ?? 0];
	const peutDiviser = Boolean(
		monTour
		&& mainActiveJoueur?.status === "playing"
		&& mainActiveJoueur.cartes.length === 2
		&& mainActiveJoueur.cartes[0].rang === mainActiveJoueur.cartes[1].rang
		&& mainsDuJoueur.length < 4
		&& solde !== null
		&& solde >= Number(monJoueur.bet),
	);
	/** Entrée : montant numérique; sortie : montant formaté en devise. */
	const formatArgent = (montant) => `${Number(montant).toFixed(2)} $`;

	return (
		<section className="section">
			<div className="container">
				<div className="level is-mobile mb-4">
					<div className="level-left"><div className="level-item">
						<Link to="/" className="button is-small is-text"><span className="icon"><i className="fas fa-arrow-left" /></span><span>Tous les jeux</span></Link>
					</div></div>
					<div className="level-right"><div className="level-item"><span className="tag is-medium is-dark"><span className="icon"><i className="fas fa-coins" /></span><span>Solde : {solde === null ? "--" : formatArgent(solde)}</span></span></div></div>
				</div>

				{!salon ? <div className="box">
					<h1 className="title is-3">Salons de blackjack</h1>
					{estDealer && <button className="button is-warning mb-4" onClick={creerSalon} disabled={chargement}><span className="icon"><i className="fas fa-plus" /></span><span>Créer un salon</span></button>}
					<div className="level is-mobile mt-4">
						<div className="level-left"><p className="has-text-weight-semibold">Salons disponibles</p></div>
						<div className="level-right"><button className="button is-small" onClick={() => appeler("/salons")} disabled={chargement} aria-label="Actualiser les salons"><span className="icon"><i className="fas fa-sync-alt" /></span></button></div>
					</div>
					{salons.length === 0 ? <p>Aucun salon ouvert pour le moment.</p> : (
						<div className="table-container"><table className="table is-fullwidth is-striped">
							<thead><tr><th>Salon</th><th>État</th><th>Joueurs</th><th>Places libres</th><th /></tr></thead>
							<tbody>{salons.map((salonDisponible) => {
								const placesLibres = Math.max(0, 6 - salonDisponible.players.length);
								return <tr key={idSalon(salonDisponible)}>
									<td>{idSalon(salonDisponible).slice(-6)}</td>
									<td>{salonDisponible.status === "playing" ? "En cours" : "En attente"}</td>
									<td>{salonDisponible.players.length} / 6</td>
									<td>{placesLibres}</td>
									<td>{!estDealer && <button className="button is-small is-warning" onClick={() => rejoindreSalon(salonDisponible)} disabled={chargement || salonDisponible.status !== "waiting" || placesLibres === 0 || salonDisponible.players.some((player) => player.id_compte === utilisateur.id)}>Choisir ce salon</button>}</td>
								</tr>;
							})}</tbody>
						</table></div>
					)}
				</div> : <div className="bj-table">
					<div className="level is-mobile">
						<div className="level-left"><button className="button is-small is-text has-text-white" onClick={quitterSalon} disabled={chargement || enAnimation}>Quitter la table</button></div>
						<div className="level-right"><span className="tag is-dark">Salon {salon.salonId}</span></div>
					</div>
					<h1 className="title has-text-centered">Blackjack</h1>
					<p className="subtitle is-6 has-text-centered">Le blackjack paie 3 pour 2 · Le croupier tire jusqu'à 17</p>

					<div className="bj-zone bj-zone-croupier mb-6">
						<p className="has-text-weight-semibold">Croupier · {salon.status === "playing" ? totalMain(salon.dealer_hand.slice(0, 1)) : totalMain(salon.dealer_hand)}</p>
						<div className="bj-cartes">{salon.dealer_hand.map((carte, index) => <Carte key={index} carte={salon.status === "playing" && index === 1 ? { cachee: true } : carte} delai={planAnimation?.dealer[index] ?? null} retournement={index === 1 ? planAnimation?.retournement : null} />)}</div>
					</div>

					<div className="bj-mains bj-zone-joueur">
						{salon.players.map((player) => {
							const mains = mainsJoueur(player);
							const issues = Array.isArray(resultats[player.seat_index])
								? resultats[player.seat_index]
								: resultats[player.seat_index] ? [resultats[player.seat_index]] : [];
							const joueurLabel = player.id_compte === utilisateur.id ? "Vous" : `Siège ${player.seat_index + 1}`;
							if (mains.length === 0) {
								return <div key={player.seat_index} className="bj-main"><p className="has-text-weight-semibold">{joueurLabel} · En attente · Mise {formatArgent(player.bet ?? 0)}</p></div>;
							}
							return mains.map((main, index) => {
								const issue = issues[index];
								const delais = planAnimation?.players.find((entry) => entry.seat === player.seat_index)?.cartes ?? [];
								return <div key={`${player.seat_index}-${index}`} className={`bj-main ${player.isTurn && (player.activeHand ?? 0) === index ? "is-active" : ""}`}>
									<div className="bj-cartes">{main.cartes.map((carte, carteIndex) => <Carte key={`${carteIndex}-${carte.rang}-${carte.couleur}`} carte={carte} delai={delais[carteIndex] ?? null} />)}</div>
									<p className="has-text-weight-semibold">{joueurLabel}{mains.length > 1 ? ` · Main ${index + 1}` : ""} · {totalMain(main.cartes)} · Mise {formatArgent(main.mise ?? player.bet ?? 0)}</p>
									{issue && <span className={`tag bj-resultat is-medium ${issue === "gagne" || issue === "blackjack" ? "is-success" : issue === "egalite" ? "is-light bj-egalite" : "is-danger bj-perte"}`}>{issue === "blackjack" ? "Blackjack" : issue === "gagne" ? "Gagné" : issue === "egalite" ? "Égalité · mise rendue" : "Perdu"}</span>}
								</div>;
							});
						})}
					</div>

					{enAttente && monJoueur && monJoueur.bet === 0 && <form onSubmit={placerMise} className="has-text-centered mt-5">
						<div className="buttons is-centered mb-2">
							{[10, 20, 50, 100].map((jeton) => <button
								key={jeton}
								type="button"
								className="button is-rounded is-warning is-light"
								onClick={() => setMise((montantActuel) => {
									const prochainMontant = Number(montantActuel || 0) + jeton;
									return solde === null ? prochainMontant : Math.min(prochainMontant, solde);
								})}
								disabled={chargement || (solde !== null && Number(mise) >= solde)}
							>
								+{jeton}
							</button>)}
							<button type="button" className="button is-rounded is-danger is-light" onClick={() => setMise(solde)} disabled={chargement || solde === null || solde <= 0}>Tout miser</button>
						</div>
						<div className="field has-addons has-addons-centered"><div className="control"><input className="input" type="number" min="0.01" step="0.01" value={mise} onChange={(event) => setMise(event.target.value)} aria-label="Montant de la mise" /></div><div className="control"><button className="button is-warning" type="submit" disabled={chargement}>Confirmer la mise</button></div></div>
					</form>}
					{enAttente && salon.players.some((player) => player.bet > 0) && <p className="has-text-centered mt-5" role="status">La partie commence automatiquement dans {compteRebours ?? 10} secondes.</p>}
					{monTour && <div className="buttons is-centered mt-5">
						<button className="button is-light is-medium" onClick={() => actionJoueur("hit")} disabled={chargement || enAnimation}><span className="icon"><i className="fas fa-plus" /></span><span>Tirer</span></button>
						<button className="button is-light is-medium" onClick={() => actionJoueur("stand")} disabled={chargement || enAnimation}><span className="icon"><i className="fas fa-hand-paper" /></span><span>Rester</span></button>
						{peutDiviser && <button className="button is-light is-medium" onClick={() => actionJoueur("split")} disabled={chargement || enAnimation}><span className="icon"><i className="fas fa-columns" /></span><span>Séparer</span></button>}
					</div>}
					{salon.status === "finished" && <p className="has-text-centered mt-5">Manche terminée. Les résultats sont affichés ci-dessus.</p>}
				</div>}

				{message && <p className="notification is-danger is-light mt-4 mb-0" role="alert">{message}</p>}
			</div>
		</section>
	);
}

export default Blackjack;