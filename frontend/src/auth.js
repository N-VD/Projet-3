// Contenu du token de connexion (id, nom, role), ou null si absent ou illisible
export function lireToken() {
	const token = localStorage.getItem("token");
	if (!token) return null;
	try {
		return JSON.parse(atob(token.split(".")[1]));
	} catch {
		return null;
	}
}

export function estCroupier() {
	return ["croupier", "admin"].includes(lireToken()?.role?.toLowerCase());
}
