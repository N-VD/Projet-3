import { DUREE_DISTRIBUTION, DUREE_RETOURNEMENT, PAS_DISTRIBUTION } from "./constantes.js";

function mouvementReduit() {
	return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function planifierAnimations(ancienne, nouvelle) {
	const plan = {
		players: nouvelle.players.map((player) => ({ seat: player.seat_index, cartes: player.hand.map(() => null) })),
		dealer: nouvelle.dealer_hand.map(() => null),
		retournement: null,
		duree: 0,
	};
	let temps = 0;
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
				if (player.hand.length > index) {
					distribuer(plan.players.find((entry) => entry.seat === player.seat_index).cartes, index);
				}
			}
			if (nouvelle.dealer_hand.length > index) {
				distribuer(plan.dealer, index);
			}
		}
	}

	nouvelle.players.forEach((player) => {
		const anciennesCartes = ancienneParSiege.get(player.seat_index)?.hand ?? [];
		player.hand.forEach((_, index) => {
			if (index >= anciennesCartes.length) {
				distribuer(plan.players.find((entry) => entry.seat === player.seat_index).cartes, index);
			}
		});
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