import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login({ setIsLoggedIn }) {
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
      navigate("/dashboard");
    } catch {
      setMessage("Impossible de joindre le serveur. Réessayez plus tard.");
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="columns is-centered">
          <div className="column is-one-third">
            <div className="box">
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
                <button className="button is-primary is-fullwidth" type="submit">Se connecter</button>
                {message && <p className="has-text-danger mt-3">{message}</p>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
