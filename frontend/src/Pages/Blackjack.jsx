import { useEffect, useRef, useState } from "react";
import { connecterSocket, deconnecterSocket } from "../services/socket.js";
import "./Blackjack.css";
import {
	API_URL,
	Carte,
	lireUtilisateur,
	mainsJoueur,
	melangerSabot,
	planifierAnimations,
	SIEGE_INACTIF,
	totalMain,
} from "./reglesBlackjack/outils.js";

function memeIdentifiant(premier, second) {
	return premier != null && second != null && String(premier) === String(second);
}

function Blackjack({ salon, setSalon, setIsLoggedIn, retourAuxSalons }) {
	const utilisateur = lireUtilisateur();
	const idUtilisateur = utilisateur.id ?? utilisateur._id;
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
		const socket = connecterSocket();
		socket.on("mise_a_jour_table", (data) => {
			if (data.salon) {
				setSalon(data.salon);
			}
		});
		return () => {
			socket.off("mise_a_jour_table");
			deconnecterSocket();
		};
	}, [setSalon]);

	const salonRef = useRef(salon);
	useEffect(() => {
		salonRef.current = salon;
	}, [salon]);

	useEffect(() => {
		lancementAutomatique.current = () => {
			const salonActuel = salonRef.current;
			if (!salonActuel) return;
			distribuer();
		};
	}, []);

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			setSolde(0);
			return;
		}
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
			.catch(() => { });
	}, [setIsLoggedIn]);

	async function appeler(chemin, options = {}) {
		setMessage("");
		setChargement(true);
		try {
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
			if (response.status === 401) {
				localStorage.removeItem("token");
				setIsLoggedIn(false);
				return null;
			}
			if (!response.ok) {
				setMessage(data.message || "Erreur du serveur.");
				return null;
			}
			return data;
		} catch {
			setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
			return null;
		} finally {
			setChargement(false);
		}
	}

	function payloadSalon(etat) {
		return {
			salonId: etat.salonId,
			status: etat.status,
			dealer_hand: etat.dealer_hand,
			players: etat.players.map((player) => ({
				id_compte: player.id_compte,
				seat_index: player.seat_index,
				hands: player.hands ?? [],
				resultats: player.resultats ?? [],
				activeHand: player.activeHand ?? 0,
				bet: player.bet ?? 0,
				status: player.status ?? "waiting",
				isTurn: Boolean(player.isTurn),
			})),
			currentTurnSeat: etat.currentTurnSeat ?? SIEGE_INACTIF,
		};
	}

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
		const socket = connecterSocket();
		socket.emit("action_jeu", { codeSalon: salon.salonId, salonMaj: salonMisAJour });
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

	async function placerMise(event) {
		event.preventDefault();
		if (!salon || !Number.isFinite(Number(mise)) || Number(mise) <= 0) return;
		if (solde !== null && Number(mise) > solde) {
			setMessage("La mise ne peut pas dépasser votre solde.");
			return;
		}
		const players = salon.players.map((player) => memeIdentifiant(player.id_compte, idUtilisateur)
			? { ...player, bet: Number(mise) }
			: player);
		await sauvegarder({ ...salon, players, currentTurnSeat: SIEGE_INACTIF });
	}

	function distribuer() {
		if (!salon) return;
		if (!salon.players.some((player) => player.bet > 0)) {
			setMessage("Un joueur doit placer une mise avant le début de la manche.");
			return;
		}
		const cartes = melangerSabot();
		const players = salon.players.map((player) => {
			if (player.bet <= 0) return { ...player, hand: [], hands: [], resultats: [], activeHand: 0, status: "waiting", isTurn: false };
			const hand = [cartes.pop(), cartes.pop()];
			const naturel = totalMain(hand) === 21;
			return {
				...player,
				hand,
				hands: [{ cartes: hand, mise: player.bet, status: naturel ? "blackjack" : "playing", naturel }],
				resultats: [],
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

	async function terminer(etat, cartesRestantes, resultatsActuels) {
		const players = etat.players.map((player) => ({ ...player, isTurn: false }));
		let dealerHand = [...etat.dealer_hand];
		while (totalMain(dealerHand) < 17 && cartesRestantes.length) {
			dealerHand.push(cartesRestantes.pop());
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
			players: players.map((player) => ({
				...player,
				resultats: prochainsResultats[player.seat_index] ?? [],
				status: player.bet > 0 ? "finished" : "waiting",
				isTurn: false,
			})),
			currentTurnSeat: SIEGE_INACTIF,
		};
		await sauvegarder(partieTerminee, cartesRestantes, prochainsResultats);
	}

	async function nouvelleManche() {
		if (!salon || salon.status !== "finished") return;
		const etat = {
			...salon,
			status: "waiting",
			dealer_hand: [],
			currentTurnSeat: SIEGE_INACTIF,
			players: salon.players.map((player) => ({
				...player,
				hand: [],
				hands: [],
				resultats: [],
				activeHand: 0,
				bet: 0,
				status: "waiting",
				isTurn: false,
			})),
		};
		if (await sauvegarder(etat, sabot, {})) setResultats({});
	}

	async function actionJoueur(action) {
		if (!salon || !monJoueur?.isTurn || !["hit", "stand", "split"].includes(action)) return;
		const cards = [...sabot];
		let players = salon.players.map((player) => ({
			...player,
			hands: mainsJoueur(player).map((main) => ({ ...main, cartes: [...main.cartes] })),
		}));
		const joueur = players.find((player) => memeIdentifiant(player.id_compte, idUtilisateur));
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

	async function quitterSalon() {
		if (!salon) return;
		const joueur = salon.players.find((player) => memeIdentifiant(player.id_compte, idUtilisateur));

		if (salon.status === "waiting" && joueur) {
			const joueurs = salon.players
				.filter((player) => !memeIdentifiant(player.id_compte, idUtilisateur))
				.map((player) => ({ ...player, isTurn: false }));
			const etat = { ...salon, players: joueurs, currentTurnSeat: SIEGE_INACTIF };
			if (!(await sauvegarder(etat))) return;
		} else if (salon.status === "playing" && joueur) {
			const joueurs = salon.players.map((player) => (
				memeIdentifiant(player.id_compte, idUtilisateur) && player.status === "playing"
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
				if (!(await sauvegarder(etat))) return;
			} else {
				await terminer(etat, sabot, resultats);
			}
		} else {
			setMessage("Votre place dans le salon est introuvable.");
			return;
		}

		setSalon(null);
	}

	lancementAutomatique.current = distribuer;

	useEffect(() => {
		const joueursEnAttente = salon?.status === "waiting" && salon.players.some((player) => player.bet > 0);
		if (!joueursEnAttente) return undefined;
		const duree = 10_000;
		const depart = Date.now();
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

	const role = String(utilisateur?.role ?? "").toLowerCase();
	const estDealer = role === "dealer" || role === "admin";
	const monJoueur = salon?.players.find((player) => memeIdentifiant(player.id_compte, idUtilisateur));
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
	const formatArgent = (montant) => `${Number(montant).toFixed(2)} $`;

	return (
		<section className="section">
			<div className="container">
				<div className="bj-table">
					<div className="level is-mobile">
						<div className="level-left">
							{estDealer ? (
								<button className="button is-small is-light mr-2" onClick={retourAuxSalons} disabled={chargement || enAnimation}>
									Retour aux salons
								</button>
							) : null}
							<button className="button is-small is-text has-text-white" onClick={quitterSalon} disabled={chargement || enAnimation}>Quitter la table</button>
						</div>
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
							const issues = Array.isArray(player.resultats) && player.resultats.length > 0
								? player.resultats
								: Array.isArray(resultats[player.seat_index])
									? resultats[player.seat_index]
									: resultats[player.seat_index] ? [resultats[player.seat_index]] : [];

							const estMonJoueur = memeIdentifiant(player.id_compte, idUtilisateur);
							const nomJoueur = player.nom || player.email || `Joueur ${player.seat_index + 1}`;
							const joueurLabel = estMonJoueur ? "Vous" : nomJoueur;

							if (mains.length === 0) {
								return (
									<div key={player.seat_index} className="bj-main">
										<p className="has-text-weight-semibold">
											Siège {player.seat_index + 1} ({joueurLabel}) · En attente · Mise {formatArgent(player.bet ?? 0)}
										</p>
									</div>
								);
							}

							return mains.map((main, index) => {
								const issue = issues[index];
								const delais = planAnimation?.players.find((entry) => entry.seat === player.seat_index)?.cartes ?? [];
								const tourActif = player.isTurn && (player.activeHand ?? 0) === index;

								return (
									<div
										key={`${player.seat_index}-${index}`}
										className={`bj-main ${tourActif ? "is-active" : ""}`}
									>
										<div className="bj-cartes">
											{main.cartes
												.filter(carte => carte !== null && carte !== undefined)
												.map((carte, carteIndex) => (
													<Carte
														key={`${carteIndex}-${carte.rang ?? 'inconnu'}-${carte.couleur ?? 'inconnue'}`}
														carte={carte}
														delai={delais[carteIndex] ?? null}
													/>
												))}
										</div>
										<p className="has-text-weight-semibold">
											Siège {player.seat_index + 1} ({joueurLabel})
											{mains.length > 1 ? ` · Main ${index + 1}` : ""}
											· Total: {totalMain(main.cartes)}
											· Mise: {formatArgent(main.mise ?? player.bet ?? 0)}
										</p>
										{issue && (
											<span className={`tag bj-resultat is-medium ${issue === "gagne" || issue === "blackjack"
												? "is-success"
												: issue === "egalite"
													? "is-light bj-egalite"
													: "is-danger bj-perte"
												}`}>
												{issue === "blackjack" ? "Blackjack" : issue === "gagne" ? "Gagné" : issue === "egalite" ? "Égalité" : "Perdu"}
											</span>
										)}
									</div>
								);
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
					{salon.status === "finished" && (
						<div className="has-text-centered mt-5">
							<p className="mb-3">Manche terminée. Les résultats sont affichés ci-dessus.</p>
							<button
								className="button is-primary is-medium"
								onClick={nouvelleManche}
								disabled={chargement}
							>
								Nouvelle Manche
							</button>
						</div>
					)}
				</div>

				{message && <p className="notification is-danger is-light mt-4 mb-0" role="alert">{message}</p>}
			</div>
		</section>
	);
}

export default Blackjack;
