import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "./reglesBlackjack/outils.js";
import "./Navbar.css";

export default function Navbar({ isLoggedIn, setIsLoggedIn, soldeGlobal }) {
    const location = useLocation();
    const navigate = useNavigate();
    const isComptePage = location.pathname === "/compte";
    const [solde, setSolde] = useState(null);

    // Déconnecté : pas besoin de remettre solde à null, il n'est affiché que si isLoggedIn
    // (et la déconnexion recharge la page)
    useEffect(() => {
        let annule = false;
        const controleur = new AbortController();
        const mettreAJourSolde = (event) => {
            const nouveauSolde = event.detail?.solde;
            if (nouveauSolde === undefined || nouveauSolde === null) return;
            controleur.abort();
            setSolde(nouveauSolde);
        };
        window.addEventListener("solde:mis-a-jour", mettreAJourSolde);
        if (!isLoggedIn) {
            Promise.resolve().then(() => {
                if (!annule) setSolde(null);
            });
            return () => {
                annule = true;
                controleur.abort();
                window.removeEventListener("solde:mis-a-jour", mettreAJourSolde);
            };
        }

        const token = localStorage.getItem("token");
        if (!token) {
            Promise.resolve().then(() => {
                if (!annule) setSolde(null);
            });
            return () => {
                annule = true;
                controleur.abort();
                window.removeEventListener("solde:mis-a-jour", mettreAJourSolde);
            };
        }

        fetch(`${API_URL}/solde`, {
            signal: controleur.signal,
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error("Solde indisponible");
                }
                const data = await response.json();
                if (!annule) setSolde(data.solde ?? 0);
            })
            .catch(() => {
                if (!annule && !controleur.signal.aborted) setSolde(null);
            });
        return () => {
            annule = true;
            controleur.abort();
            window.removeEventListener("solde:mis-a-jour", mettreAJourSolde);
        };
    }, [isLoggedIn]);

    function handleLogout() {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        navigate("/login", { replace: true });
    }

    function formatArgent(montant) {
        return `${Number(montant).toFixed(2)} $`;
    }

    return (
        <div>
            <nav
                className="navbar"
                role="navigation"
                aria-label="main navigation"
                style={{
                    position: "relative",
                    zIndex: 60,
                    background: "linear-gradient(90deg, #0f7a3b 0%, #1ca35c 50%, #0d5f2d 100%)",
                    boxShadow: "0 4px 14px rgba(12, 72, 32, 0.3)",
                    borderBottom: "2px solid #d4af37",
                }}
            >
                <div className="navbar-brand">
                    <Link
                        to="/"
                        className="navbar-item navbar-brand-link has-text-weight-bold has-text-white"
                        style={{ fontSize: "1.7rem", letterSpacing: "0.04em" }}
                    >
                        BelleVibe Casino
                    </Link>
                </div>
                <div className="navbar-end">
                    {isLoggedIn && !isComptePage && (soldeGlobal ?? solde) !== null && (
                        <div className="navbar-item">
                            <span className="tag is-success is-medium" style={{ fontSize: "0.95rem" }}>
                                <span className="icon"><i className="fas fa-coins" /></span>
                                <span>Solde : {formatArgent(soldeGlobal ?? solde)}</span>
                            </span>
                        </div>
                    )}
                    {isLoggedIn ? (
                        <>
                            {!isComptePage && (
                                <div className="navbar-item">
                                    <button className="button is-light" onClick={() => navigate("/compte")}>
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