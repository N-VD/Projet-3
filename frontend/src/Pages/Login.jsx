import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login({ setIsLoggedIn }) {
	const [nom, setNom] = useState("");
	const [password, setPassword] = useState("");
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
				<h1 className="title">Connexion</h1>

				<form onSubmit={handleSubmit}>
					<div className="field">
						<label className="label">Nom d'utilisateur</label>
						<input
							className="input"
							type="text"
							value={nom}
							onChange={(e) => setNom(e.target.value)}
							required
						/>
					</div>

					<div className="field">
						<label className="label">Mot de passe</label>
						<input
							className="input"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>

					<div className="field">
						<button className="button is-primary" type="submit">
							Se connecter
						</button>
					</div>

					{message && <p>{message}</p>}
				</form>
			</div>
		</section>
	);
}

export default Login;
