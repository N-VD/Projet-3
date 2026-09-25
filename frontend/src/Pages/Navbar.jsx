import { Link, useLocation } from "react-router-dom";

export default function Navbar({ isLoggedIn, setIsLoggedIn }) {
    const location = useLocation();
    const isComptePage = location.pathname === "/compte";

    function handleLogout() {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        window.location.href = "/"; // Rediriger vers la page d'accueil après la déconnexion
    }

    return (
        <div>
            <nav
                className="navbar"
                role="navigation"
                aria-label="main navigation"
                style={{
                    background: "linear-gradient(90deg, #0f7a3b 0%, #1ca35c 50%, #0d5f2d 100%)",
                    boxShadow: "0 4px 14px rgba(12, 72, 32, 0.3)",
                    borderBottom: "2px solid #d4af37",
                }}
            >
                <div className="navbar-brand">
                    <span
                        className="navbar-item has-text-weight-bold has-text-white"
                        style={{ fontSize: "1.7rem", letterSpacing: "0.04em" }}
                    >
                        BelleVibe Casino
                    </span>
                </div>
                <div className="navbar-end">
                    {isLoggedIn ? (
                        <>
                            {!isComptePage && (
                                <div className="navbar-item">
                                    <button className="button is-light" onClick={() => window.location.href = "/compte"}>
                                        Compte
                                    </button>
                                </div>
                            )}
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
                        ) : (
                            <span className="tag is-warning">Non connecté</span>
                        )}
                    </div>
                </div>
            </nav>

        </div>
    );
}