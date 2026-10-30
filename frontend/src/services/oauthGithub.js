import { API_URL } from "../Pages/reglesBlackjack/constantes.js";

export const CLE_STATE_GITHUB = "github_oauth_state";

// Lance la connexion GitHub : le state est gardé dans le navigateur pour être vérifié au retour
export function connecterAvecGithub() {
	const state = crypto.randomUUID();
	sessionStorage.setItem(CLE_STATE_GITHUB, state);
	window.location.href = `${API_URL}/auth/github?state=${state}`;
}

// Vérifie les paramètres renvoyés par GitHub; retourne un message d'erreur ou null
export function verifierRetourGithub(searchParams) {
	if (searchParams.get("error")) {
		return "Connexion GitHub annulée.";
	}
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	if (!code || !state || state !== sessionStorage.getItem(CLE_STATE_GITHUB)) {
		return "Réponse de GitHub invalide. Réessayez de vous connecter.";
	}
	return null;
}
