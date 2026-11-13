import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { connecterAvecGithub } from "../services/oauthGithub.js";

function Login({ setIsLoggedIn, setIsGuest }) {
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");




    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || data.message || "Identifiants incorrects");
        return;
      }

      localStorage.setItem("token", data.token);
      setIsLoggedIn(true);
      navigate("/");
    } catch {
      setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
    }
  }

  // Sans compte : même lobby et mêmes tables, le socket donne le rôle spectateur
  function passerAuModeSpectateur() {
    sessionStorage.setItem("guest", "true");
    setIsGuest?.(true);
    navigate("/");
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "rgba(15, 23, 42, 0.35)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 40,
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div className="box" style={{ border: "1px solid #d6d6d6", borderRadius: "16px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)", padding: "1.5rem" }}>
          <h1 className="title">Connexion</h1>
          <div className="tabs is-toggle is-fullwidth">
            <ul>
              <li className="is-active"><a>Se connecter</a></li>
              <li><Link to="/register">Créer un compte</Link></li>
            </ul>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="login-name">Nom d'utilisateur ou courriel</label>
              <div className="control has-icons-left">
                <input id="login-name" className="input" type="text" value={identifiant} onChange={(event) => setIdentifiant(event.target.value)} autoComplete="username" required />
                <span className="icon is-small is-left"><i className="fas fa-user" /></span>
              </div>
            </div>
            <label className="label" htmlFor="login-password">Mot de passe</label>
            <div className="field has-addons">
              <div className="control has-icons-left is-expanded">
                <input id="login-password" className="input" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
                <span className="icon is-small is-left"><i className="fas fa-lock" /></span>
              </div>
              <div className="control">
                <button className="button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Afficher le mot de passe">
                  <span className="icon is-small"><i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} /></span>
                </button>
              </div>
            </div>
            <button className="button is-fullwidth" style={{ background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }} type="submit">Se connecter</button>
            {message && <p className="has-text-danger mt-3">{message}</p>}
          </form>
          <button className="button is-dark is-fullwidth mt-3" type="button" onClick={connecterAvecGithub}>
            <span className="icon"><i className="fab fa-github" /></span>
            <span>Se connecter avec GitHub</span>
          </button>
          <p className="has-text-centered has-text-grey my-3">ou</p>
          <button className="button is-dark is-fullwidth mt-3" type="button" onClick={passerAuModeSpectateur}>
            <span>Continuer en tant qu'invité</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
