(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

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
})();
