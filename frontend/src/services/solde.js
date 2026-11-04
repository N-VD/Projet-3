export function notifierSoldeMisAJour(solde) {
	window.dispatchEvent(new CustomEvent("solde:mis-a-jour", {
		detail: { solde },
	}));
}
