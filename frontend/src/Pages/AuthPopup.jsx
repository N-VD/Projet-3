import { useLocation, useNavigate } from "react-router-dom";

export default function AuthPopup({ isLoggedIn, isGuest, setIsGuest }) {
    const location = useLocation();
    const navigate = useNavigate();

    const isAuthPage = location.pathname === "/login" || location.pathname === "/register" || location.pathname.startsWith("/spectateur") || location.pathname.startsWith("/auth/");
    if (isLoggedIn || isGuest || isAuthPage) return null;

    function continueAsGuest() {
        sessionStorage.setItem("guest", "true");
        setIsGuest(true);
        navigate("/spectateur");
    }

    return (
        <div className="modal is-active">
            <div className="modal-background"></div>
            <div
                className="modal-content box has-text-centered"
                style={{ borderTop: "4px solid #d4af37", maxWidth: "420px" }}
            >
                <h2 className="title is-4" style={{ color: "#0f7a3b" }}>
                    Bienvenue sur BelleVibe Casino
                </h2>
                <p className="mb-5">Connectez-vous ou créez un compte pour profiter de toutes les fonctionnalités.</p>
                <div className="buttons is-flex-direction-column">
                    <button
                        className="button is-fullwidth has-text-white"
                        style={{ backgroundColor: "#0f7a3b" }}
                        onClick={() => navigate("/login")}
                    >
                        Se connecter
                    </button>
                    <button className="button is-fullwidth is-warning" onClick={() => navigate("/register")}>
                        S'inscrire
                    </button>
                    <button className="button is-fullwidth is-light" onClick={continueAsGuest}>
                        Continuer en tant qu'invité
                    </button>
                </div>
            </div>
        </div>
    );
}
