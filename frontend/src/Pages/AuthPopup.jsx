import { useLocation, useNavigate } from "react-router-dom";
import Login from "./Login.jsx";
import Register from "./Register.jsx";

export default function AuthPopup({ isLoggedIn, isGuest, setIsGuest, setIsLoggedIn, authModal, setAuthModal }) {
    const location = useLocation();
    const navigate = useNavigate();

    const isAuthPage = location.pathname === "/login" || location.pathname === "/register" || location.pathname.startsWith("/auth/");
    if (isLoggedIn || isGuest || isAuthPage) return null;

    function continueAsGuest() {
        sessionStorage.setItem("guest", "true");
        setIsGuest(true);
        navigate("/");
    }

    if (authModal) {
        const Formulaire = authModal === "login" ? Login : Register;
        return (
            <div className="modal is-active" style={{ zIndex: 80 }}>
                <div className="modal-background" onClick={() => setAuthModal(null)} style={{ background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}></div>
                <div className="modal-content" style={{ maxWidth: "460px", width: "95%" }}>
                    <div className="box" style={{ borderRadius: "16px", border: "1px solid #d6d6d6", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)" }}>
                        <button
                            type="button"
                            className="delete is-large"
                            aria-label="Fermer"
                            onClick={() => setAuthModal(null)}
                            style={{ position: "absolute", right: "1rem", top: "1rem" }}
                        ></button>
                        <Formulaire
                            setIsLoggedIn={setIsLoggedIn}
                            setIsGuest={setIsGuest}
                            isModal={true}
                            onClose={() => setAuthModal(null)}
                            switchTo={(mode) => setAuthModal(mode)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal is-active" style={{ zIndex: 80 }}>
            <div className="modal-background" style={{ background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}></div>
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
                        onClick={() => setAuthModal("login")}
                    >
                        Se connecter
                    </button>
                    <button className="button is-fullwidth is-warning" onClick={() => setAuthModal("register")}>
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
