(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/Pages/AuthPopup.jsx
  var import_react_router_dom3 = __require("react-router-dom");

  // src/Pages/Login.jsx
  var import_react = __require("react");
  var import_react_router_dom = __require("react-router-dom");

  // src/Pages/reglesBlackjack/constantes.js
  var API_URL = "http://localhost:3000";

  // src/services/oauthGithub.js
  var CLE_STATE_GITHUB = "github_oauth_state";
  function connecterAvecGithub() {
    const state = crypto.randomUUID();
    sessionStorage.setItem(CLE_STATE_GITHUB, state);
    window.location.href = `${API_URL}/auth/github?state=${state}`;
  }

  // src/Pages/Login.jsx
  function Login({ setIsLoggedIn, setIsSpectateur, isModal = false, onClose = null, switchTo = null }) {
    const [identifiant, setIdentifiant] = (0, import_react.useState)("");
    const [password, setPassword] = (0, import_react.useState)("");
    const [showPassword, setShowPassword] = (0, import_react.useState)(false);
    const [message, setMessage] = (0, import_react.useState)("");
    const navigate = (0, import_react_router_dom.useNavigate)();
    async function handleSubmit(event) {
      event.preventDefault();
      setMessage("");
      try {
        const response = await fetch("http://localhost:3000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifiant, password })
        });
        const data = await response.json();
        if (!response.ok) {
          setMessage(data.error || data.message || "Identifiants incorrects");
          return;
        }
        localStorage.setItem("token", data.token);
        setIsLoggedIn(true);
        if (onClose) onClose();
        navigate("/");
      } catch {
        setMessage("Impossible de joindre le serveur. R\xE9essayez plus tard.");
      }
    }
    function passerAuModeSpectateur() {
      sessionStorage.setItem("guest", "true");
      setIsSpectateur(true);
      navigate("/spectateur");
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: isModal ? { width: "100%", maxWidth: "440px", margin: "0 auto" } : {
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
          zIndex: 40
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: "440px" } }, /* @__PURE__ */ React.createElement("div", { className: "box", style: { border: "1px solid #d6d6d6", borderRadius: "16px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)", padding: "1.5rem" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" } }, /* @__PURE__ */ React.createElement("h1", { className: "title mb-0" }, "Connexion"), isModal && onClose && /* @__PURE__ */ React.createElement("button", { type: "button", className: "delete is-large", "aria-label": "Fermer", onClick: onClose })), /* @__PURE__ */ React.createElement("div", { className: "tabs is-toggle is-fullwidth" }, /* @__PURE__ */ React.createElement("ul", null, /* @__PURE__ */ React.createElement("li", { className: "is-active" }, /* @__PURE__ */ React.createElement("a", null, "Se connecter")), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button is-white is-small", onClick: () => switchTo ? switchTo("register") : navigate("/register") }, "Cr\xE9er un compte")))), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit }, /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "login-name" }, "Nom d'utilisateur ou courriel"), /* @__PURE__ */ React.createElement("div", { className: "control has-icons-left" }, /* @__PURE__ */ React.createElement("input", { id: "login-name", className: "input", type: "text", value: identifiant, onChange: (event) => setIdentifiant(event.target.value), autoComplete: "username", required: true }), /* @__PURE__ */ React.createElement("span", { className: "icon is-small is-left" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-user" })))), /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "login-password" }, "Mot de passe"), /* @__PURE__ */ React.createElement("div", { className: "field has-addons" }, /* @__PURE__ */ React.createElement("div", { className: "control has-icons-left is-expanded" }, /* @__PURE__ */ React.createElement("input", { id: "login-password", className: "input", type: showPassword ? "text" : "password", value: password, onChange: (event) => setPassword(event.target.value), autoComplete: "current-password", required: true }), /* @__PURE__ */ React.createElement("span", { className: "icon is-small is-left" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-lock" }))), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", onClick: () => setShowPassword((visible) => !visible), "aria-label": "Afficher le mot de passe" }, /* @__PURE__ */ React.createElement("span", { className: "icon is-small" }, /* @__PURE__ */ React.createElement("i", { className: showPassword ? "fas fa-eye-slash" : "fas fa-eye" }))))), /* @__PURE__ */ React.createElement("button", { className: "button is-fullwidth", style: { background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }, type: "submit" }, "Se connecter"), message && /* @__PURE__ */ React.createElement("p", { className: "has-text-danger mt-3" }, message)), /* @__PURE__ */ React.createElement("button", { className: "button is-dark is-fullwidth mt-3", type: "button", onClick: connecterAvecGithub }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fab fa-github" })), /* @__PURE__ */ React.createElement("span", null, "Se connecter avec GitHub")), /* @__PURE__ */ React.createElement("p", { className: "has-text-centered has-text-grey my-3" }, "ou"), /* @__PURE__ */ React.createElement("button", { className: "button is-dark is-fullwidth mt-3", type: "button", onClick: passerAuModeSpectateur }, /* @__PURE__ */ React.createElement("span", null, "Continuer en tant que spectateur"))))
    );
  }
  var Login_default = Login;

  // src/Pages/Register.jsx
  var import_react2 = __require("react");
  var import_react_router_dom2 = __require("react-router-dom");
  var REGLES_MOT_DE_PASSE = [
    { texte: "Au moins 8 caract\xE8res", test: (mdp) => mdp.length >= 8 },
    { texte: "Au moins un caract\xE8re sp\xE9cial (ex. ! @ # $ %)", test: (mdp) => /[^A-Za-z0-9]/.test(mdp) }
  ];
  function aAuMoins18Ans(dateNaissance) {
    const naissance = new Date(dateNaissance);
    if (isNaN(naissance.getTime())) return false;
    const majorite = new Date(naissance);
    majorite.setFullYear(naissance.getFullYear() + 18);
    return majorite <= /* @__PURE__ */ new Date();
  }
  function Register({ setIsLoggedIn, isModal = false, onClose = null, switchTo = null }) {
    const [nom, setNom] = (0, import_react2.useState)("");
    const [password, setPassword] = (0, import_react2.useState)("");
    const [showPassword, setShowPassword] = (0, import_react2.useState)(false);
    const [dateNaissance, setDateNaissance] = (0, import_react2.useState)("");
    const [email, setEmail] = (0, import_react2.useState)("");
    const [message, setMessage] = (0, import_react2.useState)("");
    const [submitted, setSubmitted] = (0, import_react2.useState)(false);
    const navigate = (0, import_react_router_dom2.useNavigate)();
    const reglesNonRespectees = REGLES_MOT_DE_PASSE.filter((regle) => !regle.test(password));
    const showPasswordErrors = submitted || password.length > 0;
    async function handleSubmit(e) {
      e.preventDefault();
      setMessage("");
      setSubmitted(true);
      if (reglesNonRespectees.length > 0) {
        setMessage("Le mot de passe ne respecte pas les r\xE8gles : " + reglesNonRespectees.map((r) => r.texte.toLowerCase()).join(", ") + ".");
        return;
      }
      if (!aAuMoins18Ans(dateNaissance)) {
        setMessage("Vous devez avoir au moins 18 ans pour vous inscrire.");
        return;
      }
      try {
        const res = await fetch("http://localhost:3000/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom, password, date_naissance: dateNaissance, email })
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || data.message || "Erreur lors de l'inscription");
          return;
        }
        localStorage.setItem("token", data.token);
        setIsLoggedIn(true);
        if (onClose) onClose();
        navigate("/");
      } catch {
        setMessage("Impossible de joindre le serveur. R\xE9essayez plus tard.");
      }
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: isModal ? { width: "100%", maxWidth: "440px", margin: "0 auto" } : {
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
          zIndex: 40
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: "440px" } }, /* @__PURE__ */ React.createElement("div", { className: "box", style: { border: "1px solid #d6d6d6", borderRadius: "16px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)", padding: "1.5rem" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" } }, /* @__PURE__ */ React.createElement("h1", { className: "title mb-0" }, "Inscription"), isModal && onClose && /* @__PURE__ */ React.createElement("button", { type: "button", className: "delete is-large", "aria-label": "Fermer", onClick: onClose })), /* @__PURE__ */ React.createElement("div", { className: "tabs is-toggle is-fullwidth" }, /* @__PURE__ */ React.createElement("ul", null, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button is-white is-small", onClick: () => switchTo ? switchTo("login") : navigate("/login") }, "Se connecter")), /* @__PURE__ */ React.createElement("li", { className: "is-active" }, /* @__PURE__ */ React.createElement("a", null, "Cr\xE9er un compte")))), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit }, /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "register-name" }, "Nom d'utilisateur"), /* @__PURE__ */ React.createElement("div", { className: "control has-icons-left" }, /* @__PURE__ */ React.createElement("input", { id: "register-name", className: "input", type: "text", value: nom, onChange: (e) => setNom(e.target.value), autoComplete: "username", required: true }), /* @__PURE__ */ React.createElement("span", { className: "icon is-small is-left" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-user" })))), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "register-email" }, "Courriel"), /* @__PURE__ */ React.createElement("div", { className: "control has-icons-left" }, /* @__PURE__ */ React.createElement("input", { id: "register-email", className: "input", type: "email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", required: true }), /* @__PURE__ */ React.createElement("span", { className: "icon is-small is-left" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-envelope" })))), /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "register-password" }, "Mot de passe"), /* @__PURE__ */ React.createElement("div", { className: "field has-addons mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "control has-icons-left is-expanded" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "register-password",
          className: `input ${showPasswordErrors ? reglesNonRespectees.length ? "is-danger" : "is-success" : ""}`,
          type: showPassword ? "text" : "password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          autoComplete: "new-password",
          "aria-describedby": "register-password-rules",
          required: true
        }
      ), /* @__PURE__ */ React.createElement("span", { className: "icon is-small is-left" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-lock" }))), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", onClick: () => setShowPassword((visible) => !visible), "aria-label": "Afficher le mot de passe" }, /* @__PURE__ */ React.createElement("span", { className: "icon is-small" }, /* @__PURE__ */ React.createElement("i", { className: showPassword ? "fas fa-eye-slash" : "fas fa-eye" }))))), /* @__PURE__ */ React.createElement("ul", { id: "register-password-rules", className: "mb-3" }, REGLES_MOT_DE_PASSE.map((regle) => {
        const ok = regle.test(password);
        const couleur = ok ? "has-text-success" : showPasswordErrors ? "has-text-danger" : "has-text-grey";
        return /* @__PURE__ */ React.createElement("li", { key: regle.texte, className: `help ${couleur}` }, /* @__PURE__ */ React.createElement("span", { className: "icon is-small mr-1" }, /* @__PURE__ */ React.createElement("i", { className: ok ? "fas fa-check" : "fas fa-times" })), regle.texte);
      })), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "register-birthdate" }, "Date de naissance"), /* @__PURE__ */ React.createElement("div", { className: "control has-icons-left" }, /* @__PURE__ */ React.createElement("input", { id: "register-birthdate", className: "input", type: "date", value: dateNaissance, onChange: (e) => setDateNaissance(e.target.value), required: true }), /* @__PURE__ */ React.createElement("span", { className: "icon is-small is-left" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-calendar" })))), /* @__PURE__ */ React.createElement("button", { className: "button is-fullwidth", type: "submit", style: { background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" } }, "S'inscrire"), message && /* @__PURE__ */ React.createElement("p", { className: "has-text-danger mt-3", role: "alert" }, message))))
    );
  }
  var Register_default = Register;

  // src/Pages/AuthPopup.jsx
  function AuthPopup({ isLoggedIn, isGuest, setIsGuest, setIsLoggedIn, setIsSpectateur, authModal, setAuthModal }) {
    const location = (0, import_react_router_dom3.useLocation)();
    const navigate = (0, import_react_router_dom3.useNavigate)();
    const isAuthPage = location.pathname === "/login" || location.pathname === "/register" || location.pathname.startsWith("/spectateur") || location.pathname.startsWith("/auth/");
    if (isLoggedIn || isGuest || isAuthPage) return null;
    function continueAsGuest() {
      sessionStorage.setItem("guest", "true");
      setIsGuest(true);
      navigate("/spectateur");
    }
    if (authModal) {
      const Formulaire = authModal === "login" ? Login_default : Register_default;
      return /* @__PURE__ */ React.createElement("div", { className: "modal is-active", style: { zIndex: 80 } }, /* @__PURE__ */ React.createElement("div", { className: "modal-background", onClick: () => setAuthModal(null), style: { background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" } }), /* @__PURE__ */ React.createElement("div", { className: "modal-content", style: { maxWidth: "460px", width: "95%" } }, /* @__PURE__ */ React.createElement("div", { className: "box", style: { borderRadius: "16px", border: "1px solid #d6d6d6", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "delete is-large",
          "aria-label": "Fermer",
          onClick: () => setAuthModal(null),
          style: { position: "absolute", right: "1rem", top: "1rem" }
        }
      ), /* @__PURE__ */ React.createElement(
        Formulaire,
        {
          setIsLoggedIn,
          setIsSpectateur,
          isModal: true,
          onClose: () => setAuthModal(null),
          switchTo: (mode) => setAuthModal(mode)
        }
      ))));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "modal is-active", style: { zIndex: 80 } }, /* @__PURE__ */ React.createElement("div", { className: "modal-background", style: { background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-content box has-text-centered",
        style: { borderTop: "4px solid #d4af37", maxWidth: "420px" }
      },
      /* @__PURE__ */ React.createElement("h2", { className: "title is-4", style: { color: "#0f7a3b" } }, "Bienvenue sur BelleVibe Casino"),
      /* @__PURE__ */ React.createElement("p", { className: "mb-5" }, "Connectez-vous ou cr\xE9ez un compte pour profiter de toutes les fonctionnalit\xE9s."),
      /* @__PURE__ */ React.createElement("div", { className: "buttons is-flex-direction-column" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button is-fullwidth has-text-white",
          style: { backgroundColor: "#0f7a3b" },
          onClick: () => setAuthModal("login")
        },
        "Se connecter"
      ), /* @__PURE__ */ React.createElement("button", { className: "button is-fullwidth is-warning", onClick: () => setAuthModal("register") }, "S'inscrire"), /* @__PURE__ */ React.createElement("button", { className: "button is-fullwidth is-light", onClick: continueAsGuest }, "Continuer en tant qu'invit\xE9"))
    ));
  }
})();
