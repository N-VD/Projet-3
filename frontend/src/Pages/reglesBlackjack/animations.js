import { DUREE_DISTRIBUTION, DUREE_RETOURNEMENT, PAS_DISTRIBUTION } from "./constantes.js";

function mouvementReduit() {
	return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function planifierAnimations(ancienne, nouvelle) {
	const plan = {
		players: nouvelle.players.map((player) => ({
			seat: player.seat_index,
			mains: (player.hands ?? []).map((main) => (main.cartes ?? []).map(() => null)),
		})),
		dealer: nouvelle.dealer_hand.map(() => null),
		retournement: null,
		duree: 0,
	};
	let temps = 0;
	const planifierCarte = (seat, mainIndex, cardIndex) => {
		const joueur = plan.players.find((entry) => entry.seat === seat);
		const liste = joueur?.mains[mainIndex];
		if (!liste || cardIndex >= liste.length || liste[cardIndex] !== null) return;
		liste[cardIndex] = temps;
		temps += PAS_DISTRIBUTION;
	};
	const distribuer = (liste, index) => {
		if (index < liste.length && liste[index] === null) {
			liste[index] = temps;
			temps += PAS_DISTRIBUTION;
		}
	};
	const ancienneParSiege = new Map((ancienne?.players ?? []).map((player) => [player.seat_index, player]));

	if (!ancienne || (ancienne.status === "waiting" && nouvelle.status !== "waiting")) {
		for (let index = 0; index < 2; index++) {
			for (const player of [...nouvelle.players].sort((a, b) => a.seat_index - b.seat_index)) {
				(player.hands ?? []).forEach((main, mainIndex) => planifierCarte(player.seat_index, mainIndex, index));
			}
			if (nouvelle.dealer_hand.length > index) {
				distribuer(plan.dealer, index);
			}
		}
	}

	nouvelle.players.forEach((player) => {
		const anciennesMains = ancienneParSiege.get(player.seat_index)?.hands ?? [];
		const anciennesCartes = new Map();
		for (const main of anciennesMains) {
			for (const carte of main.cartes ?? []) {
				const cle = JSON.stringify([carte.rang, carte.couleur]);
				anciennesCartes.set(cle, (anciennesCartes.get(cle) ?? 0) + 1);
			}
		}
		for (const [mainIndex, main] of (player.hands ?? []).entries()) {
			for (const [cardIndex, carte] of (main.cartes ?? []).entries()) {
				const cle = JSON.stringify([carte.rang, carte.couleur]);
				const occurrences = anciennesCartes.get(cle) ?? 0;
				if (occurrences > 0) {
					anciennesCartes.set(cle, occurrences - 1);
				} else {
					planifierCarte(player.seat_index, mainIndex, cardIndex);
				}
			}
		}
	});

	if (ancienne?.status === "playing" && nouvelle.status !== "playing" && ancienne.dealer_hand[1]) {
		plan.retournement = temps;
		temps += DUREE_RETOURNEMENT;
	}
	nouvelle.dealer_hand.forEach((_, index) => {
		if (index >= (ancienne?.dealer_hand?.length ?? 0)) distribuer(plan.dealer, index);
	});

	plan.duree = mouvementReduit() || temps === 0 ? 0 : temps + DUREE_DISTRIBUTION;
	return plan;
}