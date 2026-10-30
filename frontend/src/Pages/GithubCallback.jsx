import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "./reglesBlackjack/constantes.js";
import { CLE_STATE_GITHUB, verifierRetourGithub } from "../services/oauthGithub.js";

function GithubCallback({ setIsLoggedIn }) {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const dejaTraite = useRef(false);
	const [message, setMessage] = useState(() => verifierRetourGithub(searchParams) ?? "");
	const [inscription, setInscription] = useState(null);
	const [nom, setNom] = useState("");
	const [dateNaissance, setDateNaissance] = useState("");

	function connecter(token) {
		localStorage.setItem("token", token);
		setIsLoggedIn(true);
		navigate("/");
	}

	useEffect(() => {
		// Un code GitHub n'est échangeable qu'une seule fois (StrictMode exécute l'effet deux fois)
		if (dejaTraite.current) return;
		dejaTraite.current = true;

		// Le state ne sert qu'une fois; en cas d'erreur, le message est déjà affiché
		sessionStorage.removeItem(CLE_STATE_GITHUB);
		if (message) return;
		const code = searchParams.get("code");

		(async () => {
			try {
				const response = await fetch(`${API_URL}/auth/github`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ code }),
				});
				const data = await response.json();

				if (!response.ok) {
					setMessage(data.error || data.message || "Connexion GitHub impossible");
					return;
				}
				if (data.token) {
					connecter(data.token);
					return;
				}
				// Première connexion avec ce compte GitHub : on demande la date de naissance
				setInscription(data.tokenInscription);
				setNom(data.nomSuggere ?? "");
			} catch {
				setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
			}
		})();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	async function handleSubmit(event) {
		event.preventDefault();
		setMessage("");

		try {
			const response = await fetch(`${API_URL}/auth/github/inscription`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tokenInscription: inscription, nom, date_naissance: dateNaissance }),
			});
			const data = await response.json();

			if (!response.ok) {
				setMessage(data.error || data.message || "Erreur lors de l'inscription");
				return;
			}
			connecter(data.token);
		} catch {
			setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
		}
	}

	return (
		<section className="section">
			<div className="container">
				<div className="columns is-centered">
					<div className="column is-one-third">
						<div className="box">
							<h1 className="title">Connexion GitHub</h1>
							{inscription ? (
								<form onSubmit={handleSubmit}>
									<p className="mb-4">C'est votre première connexion avec GitHub. Confirmez votre âge pour pouvoir jouer.</p>
									<div className="field">
										<label className="label" htmlFor="github-nom">Nom d'utilisateur</label>
										<div className="control has-icons-left">
											<input id="github-nom" className="input" type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />
											<span className="icon is-small is-left"><i className="fas fa-user" /></span>
										</div>
									</div>
									<div className="field">
										<label className="label" htmlFor="github-birthdate">Date de naissance</label>
										<div className="control">
											<input id="github-birthdate" className="input" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} required />
										</div>
									</div>
									<button className="button is-primary is-fullwidth" type="submit">Terminer l'inscription</button>
								</form>
							) : (
								!message && <p>Connexion en cours…</p>
							)}
							{message && <p className="has-text-danger mt-3">{message}</p>}
							{message && !inscription && <Link className="button is-light is-fullwidth mt-3" to="/login">Retour à la connexion</Link>}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default GithubCallback;
