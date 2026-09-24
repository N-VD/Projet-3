import { Link, useNavigate } from "react-router-dom";

function Navbar({ isLoggedIn, setIsLoggedIn, isGuest = false }) {
	const navigate = useNavigate();

	function handleLogout() {
		localStorage.removeItem("token");
		setIsLoggedIn(false);
		navigate("/login");
	}

	return (
		<nav className="navbar is-primary" role="navigation" aria-label="main navigation">
			<div className="navbar-brand">
				<Link to="/" className="navbar-item has-text-weight-bold">Projet-3</Link>
			</div>
			<div className="navbar-end">
				{isLoggedIn ? (
					<>
						<div className="navbar-item">
							<Link to="/dashboard" className="button is-light">
								Tableau de bord
							</Link>
						</div>
						<div className="navbar-item">
							<button className="button is-light" onClick={handleLogout}>
								Se déconnecter
							</button>
						</div>
					</>
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
					) : isGuest ? (
						<span className="tag is-info">Invité</span>
					) : (
						<span className="tag is-warning">Non connecté</span>
					)}
				</div>
			</div>
		</nav>
	);
}

export default Navbar;
