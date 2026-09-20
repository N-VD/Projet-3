import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login({ setIsLoggedIn }) {
	const [nom, setNom] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [message, setMessage] = useState("");
	const navigate = useNavigate();

	async function handleSubmit(e) {
		e.preventDefault();
		setMessage("");

		const res = await fetch("http://localhost:3000/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ nom, password }),
		});
		const data = await res.json();

		if (!res.ok) {
			setMessage(data.error || data.message || "Erreur lors de la connexion");
			return;
		}

		localStorage.setItem("token", data.token);
		setIsLoggedIn(true);
		navigate("/");
	}

	return (
		<section className="section">
			<div className="container">
				<div className="columns is-centered">
					<div className="column is-one-third">
						<div className="box">
							<h1 className="title">Connexion</h1>

							<div className="tabs is-toggle is-fullwidth">
								<ul>
									<li className="is-active">
										<a>Se connecter</a>
									</li>
									<li>
										<Link to="/register">Créer un compte</Link>
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
									<button className="button is-primary is-fullwidth" type="submit">
										Se connecter
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

export default Login;
