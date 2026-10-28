import { afterEach, expect, test, vi } from "vitest";
import { planifierAnimations } from "../Pages/reglesBlackjack/animations.js";
import { mainsJoueur } from "../Pages/reglesBlackjack/cartes.js";

afterEach(() => {
	vi.unstubAllGlobals();
});

test("mainsJoueur ne lit les cartes que depuis hands", () => {
	expect(mainsJoueur({ hand: [{ rang: "A" }] })).toEqual([]);
	expect(mainsJoueur({ hands: [{ cartes: [{ rang: "A" }] }] })).toEqual([
		{ cartes: [{ rang: "A" }] },
	]);
});

test("planifierAnimations anime les cartes distribuées aux deux mains après un split", () => {
	vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
	const ancienne = {
		status: "playing",
		dealer_hand: [{ rang: "5", couleur: "pique" }, { rang: "7", couleur: "coeur" }],
		players: [{
			seat_index: 0,
			hands: [{
				cartes: [{ rang: "8", couleur: "pique" }, { rang: "8", couleur: "coeur" }],
			}],
		}],
	};
	const nouvelle = {
		status: "playing",
		dealer_hand: ancienne.dealer_hand,
		players: [{
			seat_index: 0,
			hands: [
				{ cartes: [{ rang: "8", couleur: "pique" }, { rang: "2", couleur: "carreau" }] },
				{ cartes: [{ rang: "8", couleur: "coeur" }, { rang: "3", couleur: "trefle" }] },
			],
		}],
	};

	const plan = planifierAnimations(ancienne, nouvelle);

	expect(plan.players[0].mains[0][0]).toBeNull();
	expect(plan.players[0].mains[0][1]).not.toBeNull();
	expect(plan.players[0].mains[1][0]).toBeNull();
	expect(plan.players[0].mains[1][1]).not.toBeNull();
});
