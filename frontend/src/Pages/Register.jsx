import { useState } from "react";
import { Link } from "react-router-dom";

function Register() {
	const [nom, setNom] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [dateNaissance, setDateNaissance] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("player");
	const [montant, setMontant] = useState(0);
	const [message, setMessage] = useState("");
	const [success, setSuccess] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		setMessage("");
		setSuccess(false);

		const res = await fetch("http://localhost:3000/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				nom,
				password,
				date_naissance: dateNaissance,
				email,
				role,
				montant: Number(montant),
			}),
		});
		const data = await res.json();

		if (!res.ok) {
			setMessage(data.error || data.message || "Erreur lors de l'inscription");
			return;
		}
		setSuccess(true);
		setMessage("Compte créé avec succès !");
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
										<input id="register-name" className="input" type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />
										<span className="icon is-small is-left"><i className="fas fa-user" /></span>
									</div>
								</div>
								<div className="field">
									<label className="label" htmlFor="register-email">Email</label>
									<div className="control has-icons-left">
										<input id="register-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
										<span className="icon is-small is-left"><i className="fas fa-envelope" /></span>
									</div>
								</div>
								<label className="label" htmlFor="register-password">Mot de passe</label>
								<div className="field has-addons">
									<div className="control has-icons-left is-expanded">
										<input id="register-password" className="input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
										<span className="icon is-small is-left"><i className="fas fa-lock" /></span>
									</div>
									<div className="control">
										<button className="button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Afficher le mot de passe">
											<span className="icon is-small"><i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} /></span>
										</button>
									</div>
								</div>
								<div className="field">
									<label className="label" htmlFor="register-birthdate">Date de naissance</label>
									<div className="control has-icons-left">
										<input id="register-birthdate" className="input" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} required />
										<span className="icon is-small is-left"><i className="fas fa-calendar" /></span>
									</div>
								</div>
								<div className="field">
									<label className="label" htmlFor="register-role">Rôle</label>
									<div className="control has-icons-left">
										<div className="select is-fullwidth">
											<select id="register-role" value={role} onChange={(e) => setRole(e.target.value)}>
												<option value="player">player</option>
												<option value="admin">admin</option>
											</select>
										</div>
										<span className="icon is-small is-left"><i className="fas fa-user-tag" /></span>
									</div>
								</div>
								<div className="field">
									<label className="label" htmlFor="register-amount">Montant de départ</label>
									<div className="control has-icons-left">
										<input id="register-amount" className="input" type="number" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} />
										<span className="icon is-small is-left"><i className="fas fa-coins" /></span>
									</div>
								</div>
								<button className="button is-primary is-fullwidth" type="submit">S'inscrire</button>
								{message && <p className={`mt-3 ${success ? "has-text-success" : "has-text-danger"}`}>{message}</p>}
							</form>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Register;
