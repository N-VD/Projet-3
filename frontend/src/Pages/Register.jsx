import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Mêmes règles que le backend (validerMotDePasse)
const REGLES_MOT_DE_PASSE = [
	{ texte: "Au moins 8 caractères", test: (mdp) => mdp.length >= 8 },
	{ texte: "Au moins un caractère spécial (ex. ! @ # $ %)", test: (mdp) => /[^A-Za-z0-9]/.test(mdp) },
];

function Register({ setIsLoggedIn }) {
	const [nom, setNom] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [dateNaissance, setDateNaissance] = useState("");
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const navigate = useNavigate();

	const reglesNonRespectees = REGLES_MOT_DE_PASSE.filter((regle) => !regle.test(password));
	const showPasswordErrors = submitted || password.length > 0;

	async function handleSubmit(e) {
		e.preventDefault();
		setMessage("");
		setSubmitted(true);

		if (reglesNonRespectees.length > 0) {
			setMessage("Le mot de passe ne respecte pas les règles : " + reglesNonRespectees.map((r) => r.texte.toLowerCase()).join(", ") + ".");
			return;
		}

		try {
			const res = await fetch("http://localhost:3000/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ nom, password, date_naissance: dateNaissance, email }),
			});
			const data = await res.json();

			if (!res.ok) {
				setMessage(data.error || data.message || "Erreur lors de l'inscription");
				return;
			}

			// Connexion automatique puis redirection vers le tableau de bord
			localStorage.setItem("token", data.token);
			setIsLoggedIn(true);
			navigate("/dashboard");
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
							<h1 className="title">Inscription</h1>
							<div className="tabs is-toggle is-fullwidth">
								<ul>
									<li><Link to="/login">Se connecter</Link></li>
									<li className="is-active"><a>Créer un compte</a></li>
								</ul>
							</div>
							<form onSubmit={handleSubmit}>
								<div className="field">
									<label className="label" htmlFor="register-name">Nom d'utilisateur</label>
									<div className="control has-icons-left">
										<input id="register-name" className="input" type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="username" required />
										<span className="icon is-small is-left"><i className="fas fa-user" /></span>
									</div>
								</div>
								<div className="field">
									<label className="label" htmlFor="register-email">Courriel</label>
									<div className="control has-icons-left">
										<input id="register-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
										<span className="icon is-small is-left"><i className="fas fa-envelope" /></span>
									</div>
								</div>
								<label className="label" htmlFor="register-password">Mot de passe</label>
								<div className="field has-addons mb-1">
									<div className="control has-icons-left is-expanded">
										<input
											id="register-password"
											className={`input ${showPasswordErrors ? (reglesNonRespectees.length ? "is-danger" : "is-success") : ""}`}
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											autoComplete="new-password"
											aria-describedby="register-password-rules"
											required
										/>
										<span className="icon is-small is-left"><i className="fas fa-lock" /></span>
									</div>
									<div className="control">
										<button className="button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Afficher le mot de passe">
											<span className="icon is-small"><i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} /></span>
										</button>
									</div>
								</div>
								<ul id="register-password-rules" className="mb-3">
									{REGLES_MOT_DE_PASSE.map((regle) => {
										const ok = regle.test(password);
										const couleur = ok ? "has-text-success" : showPasswordErrors ? "has-text-danger" : "has-text-grey";
										return (
											<li key={regle.texte} className={`help ${couleur}`}>
												<span className="icon is-small mr-1"><i className={ok ? "fas fa-check" : "fas fa-times"} /></span>
												{regle.texte}
											</li>
										);
									})}
								</ul>
								<div className="field">
									<label className="label" htmlFor="register-birthdate">Date de naissance</label>
									<div className="control has-icons-left">
										<input id="register-birthdate" className="input" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} required />
										<span className="icon is-small is-left"><i className="fas fa-calendar" /></span>
									</div>
								</div>
								<button className="button is-primary is-fullwidth" type="submit">S'inscrire</button>
								{message && <p className="has-text-danger mt-3" role="alert">{message}</p>}
							</form>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Register;
