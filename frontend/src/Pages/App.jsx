import { Link } from "react-router-dom";

function App({ isLoggedIn, setIsLoggedIn }) {
	function handleLogout() {
		localStorage.removeItem("token");
		setIsLoggedIn(false);
	}

	return (
		<div>
			<nav className="navbar is-primary" role="navigation" aria-label="main navigation">
				<div className="navbar-brand">
					<span className="navbar-item has-text-weight-bold">Projet-3</span>
				</div>
				<div className="navbar-end">
					{isLoggedIn ? (
						<div className="navbar-item">
							<button className="button is-light" onClick={handleLogout}>
								Se déconnecter
							</button>
						</div>
					) : (
						<>
							<div className="navbar-item">
								<Link to="/register" className="button is-light">
									S'inscrire
								</Link>
							</div>
							<div className="navbar-item">
								<Link to="/login" className="button is-light">
									Se connecter
								</Link>
							</div>
						</>
					)}
					<div className="navbar-item">
						{isLoggedIn ? (
							<span className="tag is-success">Connecté</span>
						) : (
							<span className="tag is-warning">Non connecté</span>
						)}
					</div>
				</div>
			</nav>

			<section className="section">
				<div className="container">
					<h1 className="title">Accueil</h1>
					<p className="subtitle">Page de base du front-end, à compléter par l'équipe.</p>
				</div>
			</section>
		</div>
	);
}

export default App;