import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
	const [nom, setNom] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [dateNaissance, setDateNaissance] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("player");
	const [montant, setMontant] = useState(0);
	const [message, setMessage] = useState("");
	const navigate = useNavigate();

	async function handleSubmit(e) {
		e.preventDefault();
		setMessage("");

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

		navigate("/login");
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
									<li>
										<Link to="/login">Se connecter</Link>
									</li>
									<li className="is-active">
										<a>Créer un compte</a>
									</li>
								</ul>
							</div>

							<form onSubmit={handleSubmit}>
								<div className="field">
									<label className="label">Nom d'utilisateur</label>
									<div className="control has-icons-left">
										<input
											className="input"
											type="text"
											value={nom}
											onChange={(e) => setNom(e.target.value)}
											required
										/>
										<span className="icon is-small is-left">
											<i className="fas fa-user"></i>
										</span>
									</div>
								</div>

								<div className="field">
									<label className="label">Email</label>
									<div className="control has-icons-left">
										<input
											className="input"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											required
										/>
										<span className="icon is-small is-left">
											<i className="fas fa-envelope"></i>
										</span>
									</div>
								</div>

								<div className="field">
									<label className="label">Mot de passe</label>
									<div className="control has-icons-left has-icons-right">
										<input
											className="input"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											required
										/>
										<span className="icon is-small is-left">
											<i className="fas fa-lock"></i>
										</span>
										<span
											className="icon is-small is-right"
											style={{ pointerEvents: "auto", cursor: "pointer" }}
											onClick={() => setShowPassword((s) => !s)}
										>
											<i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
										</span>
									</div>
								</div>

								<div className="field">
									<label className="label">Date de naissance</label>
									<div className="control has-icons-left">
										<input
											className="input"
											type="date"
											value={dateNaissance}
											onChange={(e) => setDateNaissance(e.target.value)}
											required
										/>
										<span className="icon is-small is-left">
											<i className="fas fa-calendar"></i>
										</span>
									</div>
								</div>

								<div className="field">
									<label className="label">Rôle</label>
									<div className="control">
										<div className="select is-fullwidth">
											<select value={role} onChange={(e) => setRole(e.target.value)}>
												<option value="player">player</option>
												<option value="admin">admin</option>
											</select>
										</div>
									</div>
								</div>

								<div className="field">
									<label className="label">Montant de départ</label>
									<div className="control has-icons-left">
										<input
											className="input"
											type="number"
											value={montant}
											onChange={(e) => setMontant(e.target.value)}
										/>
										<span className="icon is-small is-left">
											<i className="fas fa-coins"></i>
										</span>
									</div>
								</div>

								<div className="field">
									<button className="button is-primary is-fullwidth" type="submit">
										S'inscrire
									</button>
								</div>

								{message && <p className="has-text-danger">{message}</p>}
							</form>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Register;
