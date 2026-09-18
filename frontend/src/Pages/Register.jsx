import { useState } from "react";

function Register() {
	const [nom, setNom] = useState("");
	const [password, setPassword] = useState("");
	const [dateNaissance, setDateNaissance] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("player");
	const [montant, setMontant] = useState(0);
	const [message, setMessage] = useState("");

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
		setMessage("Compte créé avec succès !");
	}

	return (
		<section className="section">
			<div className="container">
				<h1 className="title">Inscription</h1>

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
						<label className="label">Date de naissance</label>
						<input
							className="input"
							type="date"
							value={dateNaissance}
							onChange={(e) => setDateNaissance(e.target.value)}
							required
						/>
					</div>

					<div className="field">
						<label className="label">Email</label>
						<input
							className="input"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>

					<div className="field">
						<label className="label">Rôle</label>
						<div className="select">
							<select value={role} onChange={(e) => setRole(e.target.value)}>
								<option value="player">player</option>
								<option value="admin">admin</option>
							</select>
						</div>
					</div>

					<div className="field">
						<label className="label">Montant de départ</label>
						<input
							className="input"
							type="number"
							value={montant}
							onChange={(e) => setMontant(e.target.value)}
						/>
					</div>

					<div className="field">
						<button className="button is-primary" type="submit">
							S'inscrire
						</button>
					</div>

					{message && <p>{message}</p>}
				</form>
			</div>
		</section>
	);
}

export default Register;
