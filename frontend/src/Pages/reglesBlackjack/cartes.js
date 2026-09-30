import { COULEURS, RANGS } from "./constantes.js";

export function lireUtilisateur() {
	try {
		const token = localStorage.getItem("token");
		const encoded = token?.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
		if (!encoded) return {};
		const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
		return JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		return {};
	}
}

export function valeurCarte(rang) {
	if (rang === "A") return 11;
	if (["J", "Q", "K"].includes(rang)) return 10;
	return Number(rang);
}

export function totalMain(cartes) {
	let total = 0;
	let as = 0;
	for (const carte of cartes) {
		total += valeurCarte(carte.rang);
		if (carte.rang === "A") as++;
	}
	while (total > 21 && as > 0) {
		total -= 10;
		as--;
	}
	return total;
}

export function mainsJoueur(joueur) {
	if (Array.isArray(joueur.hands) && joueur.hands.length > 0) return joueur.hands;
	if (Array.isArray(joueur.hand) && joueur.hand.length > 0) {
		return [{
			cartes: joueur.hand,
			mise: joueur.bet,
			status: joueur.status === "blackjack" ? "blackjack" : joueur.status === "stand" ? "stand" : "playing",
			naturel: joueur.status === "blackjack",
		}];
	}
	return [];
}

export function melangerSabot() {
	const sabot = Array.from({ length: 6 }, () => COULEURS.flatMap((couleur) => RANGS.map((rang) => ({ rang, couleur })))).flat();
	for (let index = sabot.length - 1; index > 0; index--) {
		const autre = Math.floor(Math.random() * (index + 1));
		[sabot[index], sabot[autre]] = [sabot[autre], sabot[index]];
	}
	return sabot;
}

export function idSalon(salon) {
	return salon?.salonId ?? salon?._id;
}

export function normaliserSalon(salon) {
	if (!salon) return null;
	return { ...salon, salonId: idSalon(salon), players: salon.players ?? [], dealer_hand: salon.dealer_hand ?? [] };
}