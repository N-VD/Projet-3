// Constantes partagées par le blackjack solo et le blackjack live

export const JETONS = [5, 10, 25, 100];

export const SIDE_BETS = {
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

// Blackjack live

export const PHASES_LIVE = {
	mises: "Faites vos jeux",
	distribution: "Distribution",
	decisions: "Décisions",
	croupier: "Tour du croupier",
	resultats: "Résultats",
	nettoyage: "Nouvelle manche dans un instant",
};

export const DUREES_LIVE = { mises: 15000, decisions: 15000, resultats: 8000 };
