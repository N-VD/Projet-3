import Navbar from "../Navbar.jsx";
import { Compte } from "../Compte.jsx";

function getNomUtilisateur() {
	const token = localStorage.getItem("token");
	if (!token) return "";
	try {
		// Le payload JWT est en base64url et peut contenir des accents (UTF-8)
		const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
		const octets = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
		return JSON.parse(new TextDecoder().decode(octets)).nom ?? "";
	} catch {
		return "";
	}
}

function Dashboard({ isLoggedIn, setIsLoggedIn }) {
	const nom = getNomUtilisateur();

	return (
		<div>
			<Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
			<section className="section pb-0">
				<div className="container has-text-centered">
					<h1 className="title">Tableau de bord</h1>
					{nom && <p className="subtitle">Bienvenue, {nom} !</p>}
				</div>
			</section>
			<Compte />
		</div>
	);
}

export default Dashboard;
