(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/Routeur.jsx
  var import_react9 = __require("react");
  var import_react_router_dom9 = __require("react-router-dom");

  // src/Pages/App.jsx
  var import_react_router_dom = __require("react-router-dom");

  // src/Pages/Register.jsx
  var import_react = __require("react");
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
    const [nom, setNom] = (0, import_react.useState)("");
    const [password, setPassword] = (0, import_react.useState)("");
    const [showPassword, setShowPassword] = (0, import_react.useState)(false);
    const [dateNaissance, setDateNaissance] = (0, import_react.useState)("");
    const [email, setEmail] = (0, import_react.useState)("");
    const [message, setMessage] = (0, import_react.useState)("");
    const [submitted, setSubmitted] = (0, import_react.useState)(false);
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

  // src/Pages/Login.jsx
  var import_react2 = __require("react");
  var import_react_router_dom3 = __require("react-router-dom");

  // src/Pages/reglesBlackjack/constantes.js
  var API_URL = "http://localhost:3000";
  var COULEURS = ["pique", "coeur", "carreau", "trefle"];
  var RANGS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var SYMBOLES = { pique: "\u2660", coeur: "\u2665", carreau: "\u2666", trefle: "\u2663" };
  var SIEGE_INACTIF = 6;
  var PAS_DISTRIBUTION = 0.22;
  var DUREE_DISTRIBUTION = 0.45;
  var DUREE_RETOURNEMENT = 0.6;

  // src/services/oauthGithub.js
  var CLE_STATE_GITHUB = "github_oauth_state";
  function connecterAvecGithub() {
    const state = crypto.randomUUID();
    sessionStorage.setItem(CLE_STATE_GITHUB, state);
    window.location.href = `${API_URL}/auth/github?state=${state}`;
  }
  function verifierRetourGithub(searchParams) {
    if (searchParams.get("error")) {
      return "Connexion GitHub annul\xE9e.";
    }
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state || state !== sessionStorage.getItem(CLE_STATE_GITHUB)) {
      return "R\xE9ponse de GitHub invalide. R\xE9essayez de vous connecter.";
    }
    return null;
  }

  // src/Pages/Login.jsx
  function Login({ setIsLoggedIn, setIsSpectateur, isModal = false, onClose = null, switchTo = null }) {
    const [identifiant, setIdentifiant] = (0, import_react2.useState)("");
    const [password, setPassword] = (0, import_react2.useState)("");
    const [showPassword, setShowPassword] = (0, import_react2.useState)(false);
    const [message, setMessage] = (0, import_react2.useState)("");
    const navigate = (0, import_react_router_dom3.useNavigate)();
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

  // src/Pages/Compte.jsx
  var import_react3 = __require("react");
  var API_URL2 = "http://localhost:3000";
  function formaterDateTransaction(valeur) {
    const date = new Date(valeur);
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, "0");
    const jour = String(date.getDate()).padStart(2, "0");
    const heure = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${annee}-${mois}-${jour}, ${heure}h${minutes}`;
  }
  async function recupererTransactions(token) {
    const response = await fetch(`${API_URL2}/transactions`, {
      headers: { Authorization: "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Impossible de charger l'historique des transactions.");
    }
    return data.transactions;
  }
  function Compte() {
    const [solde, setSolde] = (0, import_react3.useState)(null);
    const [nom, setNom] = (0, import_react3.useState)("");
    const [nouveauNom, setNouveauNom] = (0, import_react3.useState)("");
    const [afficherModificationNom, setAfficherModificationNom] = (0, import_react3.useState)(false);
    const [motDePasseActuel, setMotDePasseActuel] = (0, import_react3.useState)("");
    const [nouveauMotDePasse, setNouveauMotDePasse] = (0, import_react3.useState)("");
    const [afficherModificationMotDePasse, setAfficherModificationMotDePasse] = (0, import_react3.useState)(false);
    const [message, setMessage] = (0, import_react3.useState)("");
    const [montantAjout, setMontantAjout] = (0, import_react3.useState)("");
    const [afficherAjout, setAfficherAjout] = (0, import_react3.useState)(false);
    const [montantRetrait, setMontantRetrait] = (0, import_react3.useState)("");
    const [afficherRetrait, setAfficherRetrait] = (0, import_react3.useState)(false);
    const [transactions, setTransactions] = (0, import_react3.useState)([]);
    const token = localStorage.getItem("token");
    const ajouterArgent = async (montant) => {
      if (!token) {
        setMessage("Vous devez \xEAtre connect\xE9 pour effectuer cette action.");
        return false;
      }
      try {
        const response = await fetch(`${API_URL2}/ajouterArgent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ montant })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible d'ajouter de l'argent.");
        setSolde(data.compte.montant);
        setMessage("");
        try {
          setTransactions(await recupererTransactions(token));
        } catch (error) {
          setMessage(error.message);
        }
        return true;
      } catch (error) {
        setMessage(error.message);
        return false;
      }
    };
    const retirerArgent = async (montant) => {
      if (!token) {
        setMessage("Vous devez \xEAtre connect\xE9 pour effectuer cette action.");
        return false;
      }
      try {
        const response = await fetch(`${API_URL2}/retirerArgent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ montant })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible de retirer de l'argent.");
        setSolde(data.compte.montant);
        setMessage("");
        try {
          setTransactions(await recupererTransactions(token));
        } catch (error) {
          setMessage(error.message);
        }
        return true;
      } catch (error) {
        setMessage(error.message);
        return false;
      }
    };
    const modifierNomUtilisateur = async (nom2) => {
      if (!token) {
        setMessage("Vous devez \xEAtre connect\xE9 pour effectuer cette action.");
        return false;
      }
      try {
        const response = await fetch(`${API_URL2}/modifierNomUtilisateur`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ nom: nom2 })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible de modifier le nom d'utilisateur");
        setNom(nom2);
        setMessage("");
        return true;
      } catch (error) {
        setMessage(error.message);
        return false;
      }
    };
    const modifierMotDePasse = async () => {
      if (!token) {
        setMessage("Vous devez \xEAtre connect\xE9 pour effectuer cette action.");
        return false;
      }
      try {
        const response = await fetch(`${API_URL2}/modifierMotDePasse`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ motDePasseActuel, nouveauMotDePasse })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible de modifier le mot de passe.");
        setMessage("");
        return true;
      } catch (error) {
        setMessage(error.message);
        return false;
      }
    };
    (0, import_react3.useEffect)(() => {
      if (!token) {
        return;
      }
      fetch(`${API_URL2}/solde`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible de charger le solde.");
        setSolde(data.solde);
      }).catch((error) => setMessage(error.message));
      fetch(`${API_URL2}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible de charger les informations du compte.");
        setNom(data.nom);
      }).catch((error) => setMessage(error.message));
      recupererTransactions(token).then(setTransactions).catch((error) => setMessage(error.message));
    }, [token]);
    const validerAjout = async (event) => {
      event.preventDefault();
      const montant = Number(montantAjout);
      if (!Number.isFinite(montant) || montant <= 0) {
        setMessage("Veuillez entrer un montant sup\xE9rieur \xE0 z\xE9ro.");
        return;
      }
      if (await ajouterArgent(montant)) {
        setMontantAjout("");
        setAfficherAjout(false);
      }
    };
    const validerRetrait = async (event) => {
      event.preventDefault();
      const montant = Number(montantRetrait);
      if (!Number.isFinite(montant) || montant <= 0) {
        setMessage("Veuillez entrer un montant sup\xE9rieur \xE0 z\xE9ro.");
        return;
      }
      if (await retirerArgent(montant)) {
        setMontantRetrait("");
        setAfficherRetrait(false);
      }
    };
    const validerNomUtilisateur = async (event) => {
      event.preventDefault();
      const nomNettoye = nouveauNom.trim();
      if (!nomNettoye) {
        setMessage("Veuillez entrer un nom d'utilisateur.");
        return;
      }
      if (await modifierNomUtilisateur(nomNettoye)) {
        setNouveauNom("");
        setAfficherModificationNom(false);
      }
    };
    const validerMotDePasse = async (event) => {
      event.preventDefault();
      if (await modifierMotDePasse()) {
        setMotDePasseActuel("");
        setNouveauMotDePasse("");
        setAfficherModificationMotDePasse(false);
      }
    };
    const ouvrirFormulaire = (formulaire) => {
      setAfficherModificationNom(formulaire === "nom");
      setAfficherModificationMotDePasse(formulaire === "motDePasse");
      setAfficherAjout(formulaire === "ajout");
      setAfficherRetrait(formulaire === "retrait");
    };
    return /* @__PURE__ */ React.createElement("section", { className: "section is-flex is-flex-direction-column is-align-items-center has-text-centered" }, /* @__PURE__ */ React.createElement("h1", { className: "title is-2 mb-5" }, "Bienvenue, ", nom, "!"), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "is-flex is-flex-direction-column-mobile is-align-items-center is-justify-content-center",
        style: { "4rem": "0", width: "100%" }
      },
      /* @__PURE__ */ React.createElement("div", { style: { width: "min(900px, 90vw)" } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `is-flex is-justify-content-center is-align-items-center is-flex-wrap-wrap ${afficherModificationNom || afficherModificationMotDePasse ? "mb-0" : "mb-6"}`,
          style: { width: "100%", gap: "0.75rem" }
        },
        !afficherModificationNom && /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "button is-primary",
            type: "button",
            onClick: () => {
              setNouveauNom(nom);
              ouvrirFormulaire("nom");
              setMessage("");
            }
          },
          "Modifier le nom d'utilisateur"
        ),
        !afficherModificationMotDePasse && /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "button is-primary",
            type: "button",
            onClick: () => {
              ouvrirFormulaire("motDePasse");
              setMessage("");
            }
          },
          "Modifier le mot de passe"
        )
      ), afficherModificationNom ? /* @__PURE__ */ React.createElement("div", { className: "box", style: { width: "min(520px, 90vw)", margin: "1rem auto" } }, /* @__PURE__ */ React.createElement("form", { onSubmit: validerNomUtilisateur }, /* @__PURE__ */ React.createElement("h2", { className: "title is-4" }, "Modifier le nom d'utilisateur"), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "nouveau-nom" }, "Nouveau nom d'utilisateur"), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "nouveau-nom",
          className: "input",
          type: "text",
          value: nouveauNom,
          onChange: (event) => setNouveauNom(event.target.value),
          autoFocus: true,
          required: true
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered mb-0" }, /* @__PURE__ */ React.createElement("button", { className: "button is-primary", type: "submit" }, "Valider"), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button",
          type: "button",
          onClick: () => {
            setAfficherModificationNom(false);
            setNouveauNom("");
            setMessage("");
          }
        },
        "Annuler"
      )))) : null, afficherModificationMotDePasse ? /* @__PURE__ */ React.createElement("div", { className: "box", style: { width: "min(520px, 90vw)", margin: "1rem auto" } }, /* @__PURE__ */ React.createElement("form", { onSubmit: validerMotDePasse }, /* @__PURE__ */ React.createElement("h2", { className: "title is-4" }, "Modifier le mot de passe"), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "mot-de-passe-actuel" }, "Mot de passe actuel"), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "mot-de-passe-actuel",
          className: "input",
          type: "password",
          autoComplete: "current-password",
          value: motDePasseActuel,
          onChange: (event) => setMotDePasseActuel(event.target.value),
          autoFocus: true,
          required: true
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "nouveau-mot-de-passe" }, "Nouveau mot de passe"), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "nouveau-mot-de-passe",
          className: "input",
          type: "password",
          autoComplete: "new-password",
          value: nouveauMotDePasse,
          onChange: (event) => setNouveauMotDePasse(event.target.value),
          required: true
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered mb-0" }, /* @__PURE__ */ React.createElement("button", { className: "button is-primary", type: "submit" }, "Valider"), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button",
          type: "button",
          onClick: () => {
            setAfficherModificationMotDePasse(false);
            setMotDePasseActuel("");
            setNouveauMotDePasse("");
            setMessage("");
          }
        },
        "Annuler"
      )))) : null, !afficherAjout && !afficherRetrait && /* @__PURE__ */ React.createElement("h1", { className: "title is-2 mb-5" }, "Votre solde"), /* @__PURE__ */ React.createElement("div", { className: "box", style: { width: "min(520px, 90vw)", margin: "0 auto" } }, afficherAjout ? /* @__PURE__ */ React.createElement("form", { onSubmit: validerAjout }, /* @__PURE__ */ React.createElement("h2", { className: "title is-4" }, "Ajouter de l'argent"), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "montant-ajout" }, "Montant \xE0 ajouter"), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "montant-ajout",
          className: "input",
          type: "number",
          min: "0.01",
          step: "0.01",
          value: montantAjout,
          onChange: (event) => setMontantAjout(event.target.value),
          autoFocus: true,
          required: true
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered mb-0" }, /* @__PURE__ */ React.createElement("button", { className: "button is-primary", type: "submit" }, "Valider"), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button",
          type: "button",
          onClick: () => {
            setAfficherAjout(false);
            setMessage("");
          }
        },
        "Annuler"
      ))) : afficherRetrait ? /* @__PURE__ */ React.createElement("form", { onSubmit: validerRetrait }, /* @__PURE__ */ React.createElement("h2", { className: "title is-4" }, "Retirer de l'argent"), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "montant-retrait" }, "Montant \xE0 retirer"), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "montant-retrait",
          className: "input",
          type: "number",
          min: "0.01",
          step: "0.01",
          value: montantRetrait,
          onChange: (event) => setMontantRetrait(event.target.value),
          autoFocus: true,
          required: true
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered mb-0" }, /* @__PURE__ */ React.createElement("button", { className: "button is-danger", type: "submit" }, "Valider"), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button",
          type: "button",
          onClick: () => {
            setAfficherRetrait(false);
            setMessage("");
          }
        },
        "Annuler"
      ))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "title is-3" }, solde === null ? "--" : `${Number(solde).toFixed(2)} $`)), message && /* @__PURE__ */ React.createElement("p", { className: "has-text-danger mt-3" }, message)), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "is-flex is-justify-content-center is-align-items-center is-flex-wrap-wrap mt-3",
          style: { width: "100%", gap: "0.75rem" }
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "button is-primary",
            type: "button",
            onClick: () => ouvrirFormulaire("ajout")
          },
          "Ajouter de l'argent"
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "button is-danger",
            type: "button",
            onClick: () => ouvrirFormulaire("retrait")
          },
          "Retirer de l'argent"
        )
      ), /* @__PURE__ */ React.createElement("h1", { className: "title is-2 mt-6 mb-5" }, "Historique des transactions"), /* @__PURE__ */ React.createElement("div", { className: "box mt-5", style: { width: "100%" } }, transactions.length === 0 ? /* @__PURE__ */ React.createElement("p", null, "Aucune transaction pour le moment.") : /* @__PURE__ */ React.createElement("div", { className: "table-container" }, /* @__PURE__ */ React.createElement("table", { className: "table is-fullwidth is-striped" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "has-text-left" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "has-text-right" }, "Montant"))), /* @__PURE__ */ React.createElement("tbody", null, transactions.map((transaction) => /* @__PURE__ */ React.createElement("tr", { key: transaction._id }, /* @__PURE__ */ React.createElement("td", { className: "has-text-left" }, formaterDateTransaction(transaction.created_at)), /* @__PURE__ */ React.createElement("td", { className: `has-text-right ${transaction.montant > 0 ? "has-text-success" : "has-text-danger"}` }, transaction.montant > 0 ? "+" : "", Number(transaction.montant).toFixed(2), " $"))))))))
    ));
  }

  // src/Pages/Navbar.jsx
  var import_react4 = __require("react");
  var import_react_router_dom4 = __require("react-router-dom");

  // src/Pages/reglesBlackjack/Carte.jsx
  function Carte({ carte, delai = null, retournement = null }) {
    const rouge = carte.couleur === "coeur" || carte.couleur === "carreau";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `bj-carte ${delai !== null ? "bj-distribuee" : ""} ${carte.cachee ? "est-cachee" : ""}`,
        style: { "--delai": `${delai ?? 0}s`, "--delai-retournement": `${retournement ?? 0}s` },
        "aria-label": carte.cachee ? "Carte cach\xE9e" : `${carte.rang} de ${carte.couleur}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "bj-carte-interieur" }, /* @__PURE__ */ React.createElement("div", { className: `bj-face bj-recto ${rouge ? "bj-rouge" : ""}` }, !carte.cachee && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "bj-coin" }, carte.rang, /* @__PURE__ */ React.createElement("br", null), SYMBOLES[carte.couleur]), /* @__PURE__ */ React.createElement("span", { className: "bj-centre" }, SYMBOLES[carte.couleur]), /* @__PURE__ */ React.createElement("span", { className: "bj-coin bj-bas" }, carte.rang, /* @__PURE__ */ React.createElement("br", null), SYMBOLES[carte.couleur]))), /* @__PURE__ */ React.createElement("div", { className: "bj-face bj-verso" }))
    );
  }
  var Carte_default = Carte;

  // src/Pages/reglesBlackjack/animations.js
  function mouvementReduit() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }
  function planifierAnimations(ancienne, nouvelle) {
    const plan = {
      players: nouvelle.players.map((player) => ({
        seat: player.seat_index,
        mains: (player.hands ?? []).map((main) => (main.cartes ?? []).map(() => null))
      })),
      dealer: nouvelle.dealer_hand.map(() => null),
      retournement: null,
      duree: 0
    };
    let temps = 0;
    const planifierCarte = (seat, mainIndex, cardIndex) => {
      const joueur = plan.players.find((entry) => entry.seat === seat);
      const liste = joueur?.mains[mainIndex];
      if (!liste || cardIndex >= liste.length || liste[cardIndex] !== null) return;
      liste[cardIndex] = temps;
      temps += PAS_DISTRIBUTION;
    };
    const distribuer = (liste, index) => {
      if (index < liste.length && liste[index] === null) {
        liste[index] = temps;
        temps += PAS_DISTRIBUTION;
      }
    };
    const ancienneParSiege = new Map((ancienne?.players ?? []).map((player) => [player.seat_index, player]));
    if (!ancienne || ancienne.status === "waiting" && nouvelle.status !== "waiting") {
      for (let index = 0; index < 2; index++) {
        for (const player of [...nouvelle.players].sort((a, b) => a.seat_index - b.seat_index)) {
          (player.hands ?? []).forEach((main, mainIndex) => planifierCarte(player.seat_index, mainIndex, index));
        }
        if (nouvelle.dealer_hand.length > index) {
          distribuer(plan.dealer, index);
        }
      }
    }
    nouvelle.players.forEach((player) => {
      const anciennesMains = ancienneParSiege.get(player.seat_index)?.hands ?? [];
      const anciennesCartes = /* @__PURE__ */ new Map();
      for (const main of anciennesMains) {
        for (const carte of main.cartes ?? []) {
          const cle = JSON.stringify([carte.rang, carte.couleur]);
          anciennesCartes.set(cle, (anciennesCartes.get(cle) ?? 0) + 1);
        }
      }
      for (const [mainIndex, main] of (player.hands ?? []).entries()) {
        for (const [cardIndex, carte] of (main.cartes ?? []).entries()) {
          const cle = JSON.stringify([carte.rang, carte.couleur]);
          const occurrences = anciennesCartes.get(cle) ?? 0;
          if (occurrences > 0) {
            anciennesCartes.set(cle, occurrences - 1);
          } else {
            planifierCarte(player.seat_index, mainIndex, cardIndex);
          }
        }
      }
    });
    if (ancienne?.status === "playing" && nouvelle.status !== "playing" && ancienne.dealer_hand[1]) {
      plan.retournement = temps;
      temps += DUREE_RETOURNEMENT;
    }
    nouvelle.dealer_hand.forEach((_, index) => {
      if (index >= (ancienne?.dealer_hand?.length ?? 0)) distribuer(plan.dealer, index);
    });
    plan.duree = mouvementReduit() || temps === 0 ? 0 : temps + DUREE_DISTRIBUTION;
    return plan;
  }

  // src/Pages/reglesBlackjack/cartes.js
  function lireUtilisateur() {
    try {
      const token = localStorage.getItem("token");
      const encoded = token?.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
      if (!encoded) return {};
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return {};
    }
  }
  function valeurCarte(rang) {
    if (rang === "A") return 11;
    if (["J", "Q", "K"].includes(rang)) return 10;
    return Number(rang);
  }
  function totalMain(cartes) {
    if (!Array.isArray(cartes)) return 0;
    let total = 0;
    let as = 0;
    for (const carte of cartes) {
      if (!carte || !carte.rang) continue;
      total += valeurCarte(carte.rang);
      if (carte.rang === "A") as++;
    }
    while (total > 21 && as > 0) {
      total -= 10;
      as--;
    }
    return total;
  }
  function mainsJoueur(joueur) {
    return Array.isArray(joueur.hands) ? joueur.hands : [];
  }
  function melangerSabot() {
    const sabot = Array.from({ length: 6 }, () => COULEURS.flatMap((couleur) => RANGS.map((rang) => ({ rang, couleur })))).flat();
    for (let index = sabot.length - 1; index > 0; index--) {
      const autre = Math.floor(Math.random() * (index + 1));
      [sabot[index], sabot[autre]] = [sabot[autre], sabot[index]];
    }
    return sabot;
  }
  function idSalon(salon) {
    return salon?.salonId ?? salon?._id;
  }
  function normaliserSalon(salon) {
    if (!salon) return null;
    return {
      ...salon,
      salonId: idSalon(salon),
      players: [...salon.players ?? []].sort((a, b) => a.seat_index - b.seat_index),
      dealer_hand: salon.dealer_hand ?? []
    };
  }

  // src/Pages/Navbar.jsx
  function Navbar({ isLoggedIn, setIsLoggedIn, setAuthModal }) {
    const location = (0, import_react_router_dom4.useLocation)();
    const isComptePage = location.pathname === "/compte";
    const [solde, setSolde] = (0, import_react4.useState)(null);
    (0, import_react4.useEffect)(() => {
      if (!isLoggedIn) {
        setSolde(null);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setSolde(null);
        return;
      }
      fetch(`${API_URL}/solde`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error("Solde indisponible");
        }
        const data = await response.json();
        setSolde(data.solde ?? 0);
      }).catch(() => setSolde(null));
    }, [isLoggedIn]);
    function handleLogout() {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      window.location.href = "/";
    }
    function formatArgent(montant) {
      return `${Number(montant).toFixed(2)} $`;
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      "nav",
      {
        className: "navbar",
        role: "navigation",
        "aria-label": "main navigation",
        style: {
          position: "relative",
          zIndex: 60,
          background: "linear-gradient(90deg, #0f7a3b 0%, #1ca35c 50%, #0d5f2d 100%)",
          boxShadow: "0 4px 14px rgba(12, 72, 32, 0.3)",
          borderBottom: "2px solid #d4af37"
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "navbar-brand" }, /* @__PURE__ */ React.createElement(
        import_react_router_dom4.Link,
        {
          to: "/",
          className: "navbar-item navbar-brand-link has-text-weight-bold has-text-white",
          style: { fontSize: "1.7rem", letterSpacing: "0.04em" }
        },
        "BelleVibe Casino"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "navbar-end" }, isLoggedIn && solde !== null && /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("span", { className: "tag is-success is-medium", style: { fontSize: "0.95rem" } }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-coins" })), /* @__PURE__ */ React.createElement("span", null, "Solde : ", formatArgent(solde)))), isLoggedIn ? /* @__PURE__ */ React.createElement(React.Fragment, null, !isComptePage && /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("button", { className: "button is-light", onClick: () => window.location.href = "/compte" }, "Compte")), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement(import_react_router_dom4.Link, { to: "/spectateur", className: "button is-light" }, "Spectateur")), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("button", { className: "button is-light", onClick: handleLogout }, "Se d\xE9connecter"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button is-light", onClick: () => setAuthModal("register") }, "S'inscrire")), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button is-light", onClick: () => setAuthModal("login") }, "Se connecter"))), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, isLoggedIn ? /* @__PURE__ */ React.createElement("span", { className: "tag is-success" }, "Connect\xE9") : /* @__PURE__ */ React.createElement("span", { className: "tag is-warning" }, "Non connect\xE9")))
    ));
  }

  // src/Pages/AuthPopup.jsx
  var import_react_router_dom5 = __require("react-router-dom");
  function AuthPopup({ isLoggedIn, isGuest, setIsGuest, setIsLoggedIn, setIsSpectateur, authModal, setAuthModal }) {
    const location = (0, import_react_router_dom5.useLocation)();
    const navigate = (0, import_react_router_dom5.useNavigate)();
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

  // src/Pages/Salon.jsx
  var import_react6 = __require("react");
  var import_react_router_dom6 = __require("react-router-dom");

  // src/services/socket.js
  var import_socket = __require("socket.io-client");
  var SOCKET_URL = "http://localhost:3000";
  var socket = null;
  function connecterSocket() {
    if (!socket) {
      socket = (0, import_socket.io)(SOCKET_URL, {
        autoConnect: true
      });
    }
    return socket;
  }
  function deconnecterSocket() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  // src/Pages/Blackjack.jsx
  var import_react5 = __require("react");
  function memeIdentifiant(premier, second) {
    return premier != null && second != null && String(premier) === String(second);
  }
  function Blackjack({ salon, setSalon, setIsLoggedIn, retourAuxSalons }) {
    const utilisateur = lireUtilisateur();
    const idUtilisateur = utilisateur.id ?? utilisateur._id;
    const [mise, setMise] = (0, import_react5.useState)(10);
    const [solde, setSolde] = (0, import_react5.useState)(null);
    const [sabot, setSabot] = (0, import_react5.useState)([]);
    const [resultats, setResultats] = (0, import_react5.useState)({});
    const [message, setMessage] = (0, import_react5.useState)("");
    const [chargement, setChargement] = (0, import_react5.useState)(false);
    const [compteRebours, setCompteRebours] = (0, import_react5.useState)(null);
    const lancementAutomatique = (0, import_react5.useRef)(null);
    const minuterieAnimation = (0, import_react5.useRef)(null);
    const [planAnimation, setPlanAnimation] = (0, import_react5.useState)(null);
    const [enAnimation, setEnAnimation] = (0, import_react5.useState)(false);
    (0, import_react5.useEffect)(() => () => window.clearTimeout(minuterieAnimation.current), []);
    (0, import_react5.useEffect)(() => {
      const socket2 = connecterSocket();
      socket2.on("mise_a_jour_table", (data) => {
        if (data.salon) {
          setSalon(data.salon);
        }
      });
      return () => {
        socket2.off("mise_a_jour_table");
        deconnecterSocket();
      };
    }, [setSalon]);
    const salonRef = (0, import_react5.useRef)(salon);
    (0, import_react5.useEffect)(() => {
      salonRef.current = salon;
    }, [salon]);
    (0, import_react5.useEffect)(() => {
      lancementAutomatique.current = () => {
        const salonActuel = salonRef.current;
        if (!salonActuel) return;
        distribuer();
      };
    }, []);
    (0, import_react5.useEffect)(() => {
      if (!localStorage.getItem("token")) {
        setSolde(0);
        return;
      }
      const token = localStorage.getItem("token");
      fetch(`${API_URL}/solde`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => {
        const data = await response.json();
        if (response.status === 401) {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          return;
        }
        if (response.ok) setSolde(data.solde);
      }).catch(() => {
      });
    }, [setIsLoggedIn]);
    async function appeler(chemin, options = {}) {
      setMessage("");
      setChargement(true);
      try {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("token");
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${chemin}`, {
          ...options,
          headers
        });
        const data = await response.json();
        if (response.status === 401) {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          return null;
        }
        if (!response.ok) {
          setMessage(data.message || "Erreur du serveur.");
          return null;
        }
        return data;
      } catch {
        setMessage("Impossible de joindre le serveur. R\xE9essayez plus tard.");
        return null;
      } finally {
        setChargement(false);
      }
    }
    function payloadSalon(etat) {
      return {
        salonId: etat.salonId,
        status: etat.status,
        dealer_hand: etat.dealer_hand,
        players: etat.players.map((player) => ({
          id_compte: player.id_compte,
          seat_index: player.seat_index,
          hands: player.hands ?? [],
          resultats: player.resultats ?? [],
          activeHand: player.activeHand ?? 0,
          bet: player.bet ?? 0,
          status: player.status ?? "waiting",
          isTurn: Boolean(player.isTurn)
        })),
        currentTurnSeat: etat.currentTurnSeat ?? SIEGE_INACTIF
      };
    }
    async function sauvegarder(etat, nextDeck = sabot, prochainsResultats = resultats) {
      const data = await appeler("/gameStatus", {
        method: "PATCH",
        body: JSON.stringify(payloadSalon(etat))
      });
      if (!data?.gameStatus) return false;
      const salonMisAJour = { ...salon, ...data.gameStatus, salonId: salon.salonId };
      const nouveauPlan = planifierAnimations(salon, salonMisAJour);
      setSalon(salonMisAJour);
      if (data.solde !== void 0 && data.solde !== null) setSolde(data.solde);
      setSabot(nextDeck);
      setResultats(prochainsResultats);
      const socket2 = connecterSocket();
      socket2.emit("action_jeu", { codeSalon: salon.salonId, salonMaj: salonMisAJour });
      window.clearTimeout(minuterieAnimation.current);
      if (nouveauPlan.duree > 0) {
        setPlanAnimation(nouveauPlan);
        setEnAnimation(true);
        minuterieAnimation.current = window.setTimeout(() => {
          setPlanAnimation(null);
          setEnAnimation(false);
        }, nouveauPlan.duree * 1e3);
      } else {
        setPlanAnimation(null);
        setEnAnimation(false);
      }
      return true;
    }
    async function placerMise(event) {
      event.preventDefault();
      if (!salon || !Number.isFinite(Number(mise)) || Number(mise) <= 0) return;
      if (solde !== null && Number(mise) > solde) {
        setMessage("La mise ne peut pas d\xE9passer votre solde.");
        return;
      }
      const players = salon.players.map((player) => memeIdentifiant(player.id_compte, idUtilisateur) ? { ...player, bet: Number(mise) } : player);
      await sauvegarder({ ...salon, players, currentTurnSeat: SIEGE_INACTIF });
    }
    function distribuer() {
      if (!salon) return;
      if (!salon.players.some((player) => player.bet > 0)) {
        setMessage("Un joueur doit placer une mise avant le d\xE9but de la manche.");
        return;
      }
      const cartes = melangerSabot();
      const players = salon.players.map((player) => {
        if (player.bet <= 0) return { ...player, hand: [], hands: [], resultats: [], activeHand: 0, status: "waiting", isTurn: false };
        const hand = [cartes.pop(), cartes.pop()];
        const naturel = totalMain(hand) === 21;
        return {
          ...player,
          hand,
          hands: [{ cartes: hand, mise: player.bet, status: naturel ? "blackjack" : "playing", naturel }],
          resultats: [],
          activeHand: 0,
          status: naturel ? "blackjack" : "playing",
          isTurn: false
        };
      });
      const dealerHand = [cartes.pop(), cartes.pop()];
      const premier = players.find((player) => player.status === "playing");
      const prochain = premier?.seat_index ?? SIEGE_INACTIF;
      const etat = {
        ...salon,
        status: "playing",
        dealer_hand: dealerHand,
        players: players.map((player) => ({ ...player, isTurn: player.seat_index === prochain })),
        currentTurnSeat: prochain
      };
      setSabot(cartes);
      setResultats({});
      if (!premier) terminer(etat, cartes, {});
      else sauvegarder(etat, cartes, {});
    }
    async function terminer(etat, cartesRestantes, resultatsActuels) {
      const players = etat.players.map((player) => ({ ...player, isTurn: false }));
      let dealerHand = [...etat.dealer_hand];
      while (totalMain(dealerHand) < 17 && cartesRestantes.length) {
        dealerHand.push(cartesRestantes.pop());
      }
      const totalCroupier = totalMain(dealerHand);
      const blackjackCroupier = dealerHand.length === 2 && totalCroupier === 21;
      const prochainsResultats = { ...resultatsActuels };
      for (const player of players) {
        if (player.bet <= 0) continue;
        prochainsResultats[player.seat_index] = mainsJoueur(player).map((main) => {
          const totalJoueur = totalMain(main.cartes);
          if (totalJoueur > 21) return "perdu";
          if (main.naturel && blackjackCroupier) return "egalite";
          if (main.naturel) return "blackjack";
          if (blackjackCroupier) return "perdu";
          if (totalCroupier > 21 || totalJoueur > totalCroupier) return "gagne";
          if (totalJoueur === totalCroupier) return "egalite";
          return "perdu";
        });
      }
      const partieTerminee = {
        ...etat,
        status: "finished",
        dealer_hand: dealerHand,
        players: players.map((player) => ({
          ...player,
          resultats: prochainsResultats[player.seat_index] ?? [],
          status: player.bet > 0 ? "finished" : "waiting",
          isTurn: false
        })),
        currentTurnSeat: SIEGE_INACTIF
      };
      await sauvegarder(partieTerminee, cartesRestantes, prochainsResultats);
    }
    async function nouvelleManche() {
      if (!salon || salon.status !== "finished") return;
      const etat = {
        ...salon,
        status: "waiting",
        dealer_hand: [],
        currentTurnSeat: SIEGE_INACTIF,
        players: salon.players.map((player) => ({
          ...player,
          hand: [],
          hands: [],
          resultats: [],
          activeHand: 0,
          bet: 0,
          status: "waiting",
          isTurn: false
        }))
      };
      if (await sauvegarder(etat, sabot, {})) setResultats({});
    }
    async function actionJoueur(action) {
      if (!salon || !monJoueur?.isTurn || !["hit", "stand", "split"].includes(action)) return;
      const cards = [...sabot];
      let players = salon.players.map((player) => ({
        ...player,
        hands: mainsJoueur(player).map((main2) => ({ ...main2, cartes: [...main2.cartes] }))
      }));
      const joueur = players.find((player) => memeIdentifiant(player.id_compte, idUtilisateur));
      const mains = joueur.hands;
      const activeHand = joueur.activeHand ?? 0;
      const main = mains[activeHand];
      if (!main || main.status !== "playing") return;
      if (action === "split") {
        if (main.cartes.length !== 2 || main.cartes[0].rang !== main.cartes[1].rang || mains.length >= 4) return;
        const [premiere, seconde] = main.cartes;
        const separerAs = premiere.rang === "A";
        const mainGauche = {
          cartes: [premiere, cards.pop()],
          mise: main.mise,
          status: separerAs ? "stand" : "playing",
          naturel: false
        };
        const mainDroite = {
          cartes: [seconde, cards.pop()],
          mise: main.mise,
          status: separerAs ? "stand" : "playing",
          naturel: false
        };
        mains.splice(activeHand, 1, mainGauche, mainDroite);
      } else if (action === "hit") {
        main.cartes.push(cards.pop());
        if (totalMain(main.cartes) > 21) main.status = "bust";
        else if (totalMain(main.cartes) === 21) main.status = "stand";
      } else {
        main.status = "stand";
      }
      joueur.status = mains.some((entry) => entry.status === "playing") ? "playing" : "stand";
      const autreMain = mains.findIndex((entry, index) => index > activeHand && entry.status === "playing");
      let prochainJoueur = null;
      let prochainIndexMain = -1;
      if (mains[activeHand]?.status === "playing") {
        prochainJoueur = joueur;
        prochainIndexMain = activeHand;
      } else if (autreMain >= 0) {
        prochainJoueur = joueur;
        prochainIndexMain = autreMain;
      } else {
        const autresJoueurs = players.filter((player) => player.seat_index !== joueur.seat_index && player.hands.some((entry) => entry.status === "playing")).sort((a, b) => (a.seat_index - joueur.seat_index + 6) % 6 - (b.seat_index - joueur.seat_index + 6) % 6);
        prochainJoueur = autresJoueurs[0] ?? null;
        if (prochainJoueur) prochainIndexMain = prochainJoueur.hands.findIndex((entry) => entry.status === "playing");
      }
      if (prochainJoueur) prochainJoueur.activeHand = prochainIndexMain;
      const currentTurnSeat = prochainJoueur?.seat_index ?? SIEGE_INACTIF;
      players = players.map((player) => ({ ...player, isTurn: player.seat_index === currentTurnSeat }));
      const etat = { ...salon, players, currentTurnSeat };
      if (!prochainJoueur) await terminer(etat, cards, resultats);
      else await sauvegarder(etat, cards, resultats);
    }
    async function quitterSalon() {
      if (!salon) return;
      const joueur = salon.players.find((player) => memeIdentifiant(player.id_compte, idUtilisateur));
      if (salon.status === "waiting" && joueur) {
        const joueurs = salon.players.filter((player) => !memeIdentifiant(player.id_compte, idUtilisateur)).map((player) => ({ ...player, isTurn: false }));
        const etat = { ...salon, players: joueurs, currentTurnSeat: SIEGE_INACTIF };
        if (!await sauvegarder(etat)) return;
      } else if (salon.status === "playing" && joueur) {
        const joueurs = salon.players.map((player) => memeIdentifiant(player.id_compte, idUtilisateur) && player.status === "playing" ? { ...player, status: "stand", isTurn: false } : { ...player });
        const prochain = joueurs.filter((player) => player.status === "playing").sort((a, b) => a.seat_index - b.seat_index)[0];
        const currentTurnSeat = prochain?.seat_index ?? SIEGE_INACTIF;
        const etat = {
          ...salon,
          players: joueurs.map((player) => ({ ...player, isTurn: player.seat_index === currentTurnSeat })),
          currentTurnSeat
        };
        if (prochain) {
          if (!await sauvegarder(etat)) return;
        } else {
          await terminer(etat, sabot, resultats);
        }
      } else {
        setMessage("Votre place dans le salon est introuvable.");
        return;
      }
      setSalon(null);
    }
    lancementAutomatique.current = distribuer;
    (0, import_react5.useEffect)(() => {
      const joueursEnAttente = salon?.status === "waiting" && salon.players.some((player) => player.bet > 0);
      if (!joueursEnAttente) return void 0;
      const duree = 1e4;
      const depart = Date.now();
      const intervalle = window.setInterval(() => {
        setCompteRebours(Math.max(0, Math.ceil((duree - (Date.now() - depart)) / 1e3)));
      }, 250);
      const minuterie = window.setTimeout(() => {
        setCompteRebours(null);
        lancementAutomatique.current?.();
      }, duree);
      return () => {
        window.clearInterval(intervalle);
        window.clearTimeout(minuterie);
      };
    }, [salon?.salonId, salon?.status, salon?.players]);
    const role = String(utilisateur?.role ?? "").toLowerCase();
    const estDealer = role === "dealer" || role === "admin";
    const monJoueur = salon?.players.find((player) => memeIdentifiant(player.id_compte, idUtilisateur));
    const enAttente = salon?.status === "waiting";
    const monTour = salon?.status === "playing" && monJoueur?.isTurn;
    const mainsDuJoueur = monJoueur ? mainsJoueur(monJoueur) : [];
    const mainActiveJoueur = mainsDuJoueur[monJoueur?.activeHand ?? 0];
    const peutDiviser = Boolean(
      monTour && mainActiveJoueur?.status === "playing" && mainActiveJoueur.cartes.length === 2 && mainActiveJoueur.cartes[0].rang === mainActiveJoueur.cartes[1].rang && mainsDuJoueur.length < 4 && solde !== null && solde >= Number(monJoueur.bet)
    );
    const formatArgent = (montant) => `${Number(montant).toFixed(2)} $`;
    return /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement("div", { className: "container" }, /* @__PURE__ */ React.createElement("div", { className: "bj-table" }, /* @__PURE__ */ React.createElement("div", { className: "level is-mobile" }, /* @__PURE__ */ React.createElement("div", { className: "level-left" }, estDealer ? /* @__PURE__ */ React.createElement("button", { className: "button is-small is-light mr-2", onClick: retourAuxSalons, disabled: chargement || enAnimation }, "Retour aux salons") : null, /* @__PURE__ */ React.createElement("button", { className: "button is-small is-text has-text-white", onClick: quitterSalon, disabled: chargement || enAnimation }, "Quitter la table")), /* @__PURE__ */ React.createElement("div", { className: "level-right" }, /* @__PURE__ */ React.createElement("span", { className: "tag is-dark" }, "Salon ", salon.salonId))), /* @__PURE__ */ React.createElement("h1", { className: "title has-text-centered" }, "Blackjack"), /* @__PURE__ */ React.createElement("p", { className: "subtitle is-6 has-text-centered" }, "Le blackjack paie 3 pour 2 \xB7 Le croupier tire jusqu'\xE0 17"), /* @__PURE__ */ React.createElement("div", { className: "bj-zone bj-zone-croupier mb-6" }, /* @__PURE__ */ React.createElement("p", { className: "has-text-weight-semibold" }, "Croupier \xB7 ", salon.status === "playing" ? totalMain(salon.dealer_hand.slice(0, 1)) : totalMain(salon.dealer_hand)), /* @__PURE__ */ React.createElement("div", { className: "bj-cartes" }, salon.dealer_hand.map((carte, index) => /* @__PURE__ */ React.createElement(Carte_default, { key: index, carte: salon.status === "playing" && index === 1 ? { cachee: true } : carte, delai: planAnimation?.dealer[index] ?? null, retournement: index === 1 ? planAnimation?.retournement : null })))), /* @__PURE__ */ React.createElement("div", { className: "bj-mains bj-zone-joueur" }, salon.players.map((player) => {
      const mains = mainsJoueur(player);
      const issues = Array.isArray(player.resultats) && player.resultats.length > 0 ? player.resultats : Array.isArray(resultats[player.seat_index]) ? resultats[player.seat_index] : resultats[player.seat_index] ? [resultats[player.seat_index]] : [];
      const estMonJoueur = memeIdentifiant(player.id_compte, idUtilisateur);
      const nomJoueur = player.nom || player.email || `Joueur ${player.seat_index + 1}`;
      const joueurLabel = estMonJoueur ? "Vous" : nomJoueur;
      if (mains.length === 0) {
        return /* @__PURE__ */ React.createElement("div", { key: player.seat_index, className: "bj-main" }, /* @__PURE__ */ React.createElement("p", { className: "has-text-weight-semibold" }, "Si\xE8ge ", player.seat_index + 1, " (", joueurLabel, ") \xB7 En attente \xB7 Mise ", formatArgent(player.bet ?? 0)));
      }
      return mains.map((main, index) => {
        const issue = issues[index];
        const delais = planAnimation?.players.find((entry) => entry.seat === player.seat_index)?.cartes ?? [];
        const tourActif = player.isTurn && (player.activeHand ?? 0) === index;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: `${player.seat_index}-${index}`,
            className: `bj-main ${tourActif ? "is-active" : ""}`
          },
          /* @__PURE__ */ React.createElement("div", { className: "bj-cartes" }, main.cartes.filter((carte) => carte !== null && carte !== void 0).map((carte, carteIndex) => /* @__PURE__ */ React.createElement(
            Carte_default,
            {
              key: `${carteIndex}-${carte.rang ?? "inconnu"}-${carte.couleur ?? "inconnue"}`,
              carte,
              delai: delais[carteIndex] ?? null
            }
          ))),
          /* @__PURE__ */ React.createElement("p", { className: "has-text-weight-semibold" }, "Si\xE8ge ", player.seat_index + 1, " (", joueurLabel, ")", mains.length > 1 ? ` \xB7 Main ${index + 1}` : "", "\xB7 Total: ", totalMain(main.cartes), "\xB7 Mise: ", formatArgent(main.mise ?? player.bet ?? 0)),
          issue && /* @__PURE__ */ React.createElement("span", { className: `tag bj-resultat is-medium ${issue === "gagne" || issue === "blackjack" ? "is-success" : issue === "egalite" ? "is-light bj-egalite" : "is-danger bj-perte"}` }, issue === "blackjack" ? "Blackjack" : issue === "gagne" ? "Gagn\xE9" : issue === "egalite" ? "\xC9galit\xE9" : "Perdu")
        );
      });
    })), enAttente && monJoueur && monJoueur.bet === 0 && /* @__PURE__ */ React.createElement("form", { onSubmit: placerMise, className: "has-text-centered mt-5" }, /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered mb-2" }, [10, 20, 50, 100].map((jeton) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: jeton,
        type: "button",
        className: "button is-rounded is-warning is-light",
        onClick: () => setMise((montantActuel) => {
          const prochainMontant = Number(montantActuel || 0) + jeton;
          return solde === null ? prochainMontant : Math.min(prochainMontant, solde);
        }),
        disabled: chargement || solde !== null && Number(mise) >= solde
      },
      "+",
      jeton
    )), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button is-rounded is-danger is-light", onClick: () => setMise(solde), disabled: chargement || solde === null || solde <= 0 }, "Tout miser")), /* @__PURE__ */ React.createElement("div", { className: "field has-addons has-addons-centered" }, /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement("input", { className: "input", type: "number", min: "0.01", step: "0.01", value: mise, onChange: (event) => setMise(event.target.value), "aria-label": "Montant de la mise" })), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement("button", { className: "button is-warning", type: "submit", disabled: chargement }, "Confirmer la mise")))), enAttente && salon.players.some((player) => player.bet > 0) && /* @__PURE__ */ React.createElement("p", { className: "has-text-centered mt-5", role: "status" }, "La partie commence automatiquement dans ", compteRebours ?? 10, " secondes."), monTour && /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered mt-5" }, /* @__PURE__ */ React.createElement("button", { className: "button is-light is-medium", onClick: () => actionJoueur("hit"), disabled: chargement || enAnimation }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-plus" })), /* @__PURE__ */ React.createElement("span", null, "Tirer")), /* @__PURE__ */ React.createElement("button", { className: "button is-light is-medium", onClick: () => actionJoueur("stand"), disabled: chargement || enAnimation }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-hand-paper" })), /* @__PURE__ */ React.createElement("span", null, "Rester")), peutDiviser && /* @__PURE__ */ React.createElement("button", { className: "button is-light is-medium", onClick: () => actionJoueur("split"), disabled: chargement || enAnimation }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-columns" })), /* @__PURE__ */ React.createElement("span", null, "S\xE9parer"))), salon.status === "finished" && /* @__PURE__ */ React.createElement("div", { className: "has-text-centered mt-5" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3" }, "Manche termin\xE9e. Les r\xE9sultats sont affich\xE9s ci-dessus."), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "button is-primary is-medium",
        onClick: nouvelleManche,
        disabled: chargement
      },
      "Nouvelle Manche"
    ))), message && /* @__PURE__ */ React.createElement("p", { className: "notification is-danger is-light mt-4 mb-0", role: "alert" }, message)));
  }
  var Blackjack_default = Blackjack;

  // src/Pages/Salon.jsx
  function memeIdentifiant2(premier, second) {
    return premier != null && second != null && String(premier) === String(second);
  }
  function Salon({ setIsLoggedIn, setIsSpectateur, isSpectateur }) {
    const navigate = (0, import_react_router_dom6.useNavigate)();
    const utilisateur = lireUtilisateur();
    const idUtilisateur = utilisateur.id ?? utilisateur._id;
    const role = utilisateur.role?.toLowerCase();
    const estDealer = role === "dealer" || role === "admin";
    const [salon, setSalon] = (0, import_react6.useState)(null);
    const [salons, setSalons] = (0, import_react6.useState)([]);
    const [chargement, setChargement] = (0, import_react6.useState)(false);
    const [message, setMessage] = (0, import_react6.useState)("");
    (0, import_react6.useEffect)(() => {
      const socket2 = connecterSocket();
      appeler(isSpectateur ? "/spectateur/salons" : "/salons");
      socket2.on("mise_a_jour_table", (data) => {
        if (data.salons) {
          setSalons(data.salons);
        }
      });
      return () => {
        socket2.off("mise_a_jour_table");
        deconnecterSocket();
      };
    }, [isSpectateur]);
    async function appeler(chemin, options = {}) {
      setMessage("");
      setChargement(true);
      try {
        const estModeSpectateur = Boolean(isSpectateur || chemin === "/spectateur/salons" || !localStorage.getItem("token") && chemin === "/salons");
        const cheminFinal = chemin === "/salons" && estModeSpectateur ? "/spectateur/salons" : chemin;
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("token");
        if (!estModeSpectateur && token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${cheminFinal}`, {
          ...options,
          headers
        });
        const data = await response.json();
        if (response.status === 401 && !estModeSpectateur) {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          return null;
        }
        if (!response.ok) {
          setMessage(data.message || "Erreur du serveur.");
          return null;
        }
        if (data.salons) setSalons(data.salons);
        return data;
      } catch {
        setMessage("Impossible de joindre le serveur. R\xE9essayez plus tard.");
        return null;
      } finally {
        setChargement(false);
      }
    }
    async function creerSalon() {
      const data = await appeler("/createSalon", { method: "POST", body: JSON.stringify({}) });
      if (data?.salon) {
        const salonNormalise = normaliserSalon(data.salon);
        setSalon(salonNormalise);
        await appeler("/salons");
        const socket2 = connecterSocket();
        socket2.emit("rejoindre_salon", idSalon(data.salon));
      }
    }
    async function retourAuxSalons() {
      setSalon(null);
      await appeler("/salons");
    }
    async function fermerSalon(salonAfermer) {
      if (!window.confirm("Voulez-vous fermer ce salon ?")) return;
      const data = await appeler("/deleteSalon", {
        method: "DELETE",
        body: JSON.stringify({ salonId: idSalon(salonAfermer) })
      });
      if (data) await appeler("/salons");
    }
    async function rejoindreSalon(salonChoisi) {
      const idS = idSalon(salonChoisi);
      const joueurExistant = salonChoisi.players.find((player) => memeIdentifiant2(player.id_compte, idUtilisateur));
      let data;
      if (joueurExistant) {
        data = await appeler("/addPlayer", {
          method: "POST",
          body: JSON.stringify({ salonId: idS, seat_index: joueurExistant.seat_index })
        });
      } else {
        const siegesOccupes = new Set(salonChoisi.players.map((player) => player.seat_index));
        const siegesLibres = Array.from({ length: 6 }, (_, index) => index).filter((index) => !siegesOccupes.has(index));
        if (siegesLibres.length === 0) {
          setMessage("Ce salon est complet.");
          await appeler("/salons");
          return;
        }
        const siegeAleatoire = siegesLibres[Math.floor(Math.random() * siegesLibres.length)];
        data = await appeler("/addPlayer", {
          method: "POST",
          body: JSON.stringify({ salonId: idS, seat_index: siegeAleatoire })
        });
      }
      if (data?.salon) {
        const salonNormalise = normaliserSalon(data.salon);
        setSalon(salonNormalise);
        const socket2 = connecterSocket();
        socket2.emit("rejoindre_salon", idS);
        await appeler("/salons");
      }
    }
    if (salon) {
      return /* @__PURE__ */ React.createElement(Blackjack_default, { salon, setSalon, setIsLoggedIn, isSpectateur, retourAuxSalons });
    }
    return /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement("div", { className: "container" }, /* @__PURE__ */ React.createElement("div", { className: "level is-mobile", style: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2.2rem" } }, /* @__PURE__ */ React.createElement("h1", { className: "title is-2 mb-0" }, "Salons de blackjack")), salons.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "box has-text-centered", style: { border: "1px solid #d6d6d6" } }, /* @__PURE__ */ React.createElement("p", { className: "has-text-grey" }, "Aucun salon ouvert pour le moment.")) : /* @__PURE__ */ React.createElement("div", { className: "columns is-multiline" }, salons.map((salonDisponible) => {
      const placesLibres = Math.max(0, 6 - salonDisponible.players.length);
      const estCreateur = salonDisponible.created_by === utilisateur.id;
      const joueurExistant = salonDisponible.players.some((player) => memeIdentifiant2(player.id_compte, idUtilisateur));
      const boutonAction = isSpectateur ? /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button is-warning is-fullwidth",
          onClick: () => navigate(`/spectateur/${idSalon(salonDisponible)}`),
          disabled: chargement
        },
        "Regarder"
      ) : estDealer ? estCreateur && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button is-danger is-fullwidth",
          onClick: () => fermerSalon(salonDisponible),
          disabled: chargement || salonDisponible.status === "playing",
          "aria-label": `Fermer le salon ${idSalon(salonDisponible)}`
        },
        "Fermer"
      ) : /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button is-warning is-fullwidth",
          onClick: () => rejoindreSalon(salonDisponible),
          disabled: chargement || !joueurExistant && (salonDisponible.status !== "waiting" || placesLibres === 0)
        },
        joueurExistant ? "Revenir au salon" : "Choisir ce salon"
      );
      return /* @__PURE__ */ React.createElement("div", { key: idSalon(salonDisponible), className: "column is-one-third-desktop is-half-tablet is-full-mobile", style: { display: "flex" } }, /* @__PURE__ */ React.createElement("div", { className: "card", style: { height: "100%", minHeight: "300px", width: "100%", marginBottom: 0, border: "1px solid #d6d6d6", borderRadius: "14px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("header", { className: "card-header", style: { background: "linear-gradient(90deg, #0f7a3b 0%, #1ca35c 50%, #0d5f2d 100%)", borderRadius: "14px 14px 0 0" } }, /* @__PURE__ */ React.createElement("p", { className: "card-header-title" }, "Salon ", idSalon(salonDisponible).slice(-6))), /* @__PURE__ */ React.createElement("div", { className: "card-content", style: { padding: "1.2rem 1.2rem 0.8rem", flex: "1 1 auto" } }, /* @__PURE__ */ React.createElement("div", { className: "content", style: { marginBottom: 0 } }, /* @__PURE__ */ React.createElement("p", { style: { marginBottom: "0.6rem" } }, /* @__PURE__ */ React.createElement("strong", null, "\xC9tat :"), " ", salonDisponible.status === "playing" ? "En cours" : "En attente"), /* @__PURE__ */ React.createElement("p", { style: { marginBottom: "0.6rem" } }, /* @__PURE__ */ React.createElement("strong", null, "Joueurs :"), " ", salonDisponible.players.length, " / 6"), /* @__PURE__ */ React.createElement("p", { style: { marginBottom: 0 } }, /* @__PURE__ */ React.createElement("strong", null, "Places libres :"), " ", placesLibres))), /* @__PURE__ */ React.createElement("footer", { className: "card-footer", style: { background: "linear-gradient(90deg, #0f7a3b 0%, #1ca35c 50%, #0d5f2d 100%)", padding: "0.75rem", borderRadius: "0 0 14px 14px", marginTop: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { width: "100%" } }, boutonAction))));
    })), /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered", style: { display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" } }, estDealer && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "button is-warning",
        onClick: creerSalon,
        disabled: chargement
      },
      /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-plus" })),
      /* @__PURE__ */ React.createElement("span", null, "Cr\xE9er un salon")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "button is-light",
        onClick: () => appeler("/salons"),
        disabled: chargement,
        "aria-label": "Actualiser les salons"
      },
      /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-sync-alt" })),
      /* @__PURE__ */ React.createElement("span", null, "Rafra\xEEchir")
    )), message && /* @__PURE__ */ React.createElement("p", { className: "notification is-danger is-light mt-4 mb-0", role: "alert" }, message)));
  }
  var Salon_default = Salon;

  // src/Pages/SpectateurTable.jsx
  var import_react7 = __require("react");
  var import_react_router_dom7 = __require("react-router-dom");
  var LIBELLES_STATUT = { waiting: "En attente", playing: "En cours", finished: "Termin\xE9e" };
  var LIBELLES_RESULTAT = { blackjack: "Blackjack", gagne: "Gagn\xE9", egalite: "\xC9galit\xE9 \xB7 mise rendue", perdu: "Perdu" };
  var CLASSES_RESULTAT = { blackjack: "is-success", gagne: "is-success", egalite: "is-light bj-egalite", perdu: "is-danger bj-perte" };
  function SpectateurTable() {
    const { id } = (0, import_react_router_dom7.useParams)();
    const [salon, setSalon] = (0, import_react7.useState)(null);
    const [message, setMessage] = (0, import_react7.useState)("");
    (0, import_react7.useEffect)(() => {
      let actif = true;
      async function chargerSalon() {
        try {
          const token = localStorage.getItem("token");
          let response = token ? await fetch(`${API_URL}/spectateur/compte/salons/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }) : await fetch(`${API_URL}/spectateur/salons/${id}`);
          if (token && (response.status === 401 || response.status === 403)) {
            response = await fetch(`${API_URL}/spectateur/salons/${id}`);
          }
          const data = await response.json();
          if (!actif) return;
          if (!response.ok) {
            setMessage(data.message || "Erreur du serveur.");
            setSalon(null);
            return;
          }
          setSalon(data);
          setMessage("");
        } catch {
          if (actif) setMessage("Impossible de joindre le serveur.");
        }
      }
      chargerSalon();
      const intervalle = window.setInterval(chargerSalon, 2e3);
      return () => {
        actif = false;
        window.clearInterval(intervalle);
      };
    }, [id]);
    const formatArgent = (montant) => `${Number(montant).toFixed(2)} $`;
    return /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement("div", { className: "container" }, /* @__PURE__ */ React.createElement("div", { className: "level is-mobile mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "level-left" }, /* @__PURE__ */ React.createElement("div", { className: "level-item" }, /* @__PURE__ */ React.createElement(import_react_router_dom7.Link, { to: "/spectateur", className: "button is-small is-text" }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-arrow-left" })), /* @__PURE__ */ React.createElement("span", null, "Retour aux salons")))), /* @__PURE__ */ React.createElement("div", { className: "level-right" }, /* @__PURE__ */ React.createElement("div", { className: "level-item" }, /* @__PURE__ */ React.createElement("span", { className: "tag is-medium is-dark" }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-eye" })), /* @__PURE__ */ React.createElement("span", null, "Mode spectateur"))))), message && /* @__PURE__ */ React.createElement("p", { className: "notification is-danger is-light", role: "alert" }, message), !salon && !message && /* @__PURE__ */ React.createElement("p", { className: "has-text-centered" }, "Chargement\u2026"), salon?.estMaTable && /* @__PURE__ */ React.createElement("div", { className: "notification is-info is-light has-text-centered" }, "Vous jouez \xE0 cette table.", " ", /* @__PURE__ */ React.createElement(import_react_router_dom7.Link, { to: "/jeux/blackjack" }, "Retourner \xE0 la partie")), salon && /* @__PURE__ */ React.createElement("div", { className: "bj-table" }, /* @__PURE__ */ React.createElement("div", { className: "level is-mobile" }, /* @__PURE__ */ React.createElement("div", { className: "level-left" }, /* @__PURE__ */ React.createElement("span", { className: "tag is-dark" }, LIBELLES_STATUT[salon.status] ?? salon.status)), /* @__PURE__ */ React.createElement("div", { className: "level-right" }, /* @__PURE__ */ React.createElement("span", { className: "tag is-dark" }, "Salon ", id))), /* @__PURE__ */ React.createElement("h1", { className: "title has-text-centered" }, "Blackjack"), /* @__PURE__ */ React.createElement("p", { className: "subtitle is-6 has-text-centered" }, "Le blackjack paie 3 pour 2 \xB7 Le croupier tire jusqu'\xE0 17"), /* @__PURE__ */ React.createElement("div", { className: "bj-zone bj-zone-croupier mb-6" }, /* @__PURE__ */ React.createElement("p", { className: "has-text-weight-semibold" }, "Croupier \xB7 ", salon.dealer_hand.total), /* @__PURE__ */ React.createElement("div", { className: "bj-cartes" }, salon.dealer_hand.cartes.map((carte, index) => /* @__PURE__ */ React.createElement(Carte_default, { key: index, carte })))), /* @__PURE__ */ React.createElement("div", { className: "bj-mains bj-zone-joueur" }, salon.players.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "has-text-centered" }, "Aucun joueur assis \xE0 cette table."), salon.players.map((joueur) => {
      const joueurLabel = joueur.nom ?? `Si\xE8ge ${joueur.seat_index + 1}`;
      if (joueur.mains.length === 0) {
        return /* @__PURE__ */ React.createElement("div", { key: joueur.seat_index, className: "bj-main" }, /* @__PURE__ */ React.createElement("p", { className: "has-text-weight-semibold" }, joueurLabel, " \xB7 En attente \xB7 Mise ", formatArgent(joueur.mise ?? 0)));
      }
      return joueur.mains.map((main, index) => /* @__PURE__ */ React.createElement("div", { key: `${joueur.seat_index}-${index}`, className: `bj-main ${joueur.seat_index === salon.currentTurnSeat ? "is-active" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "bj-cartes" }, main.cartes.map((carte, carteIndex) => /* @__PURE__ */ React.createElement(Carte_default, { key: carteIndex, carte }))), /* @__PURE__ */ React.createElement("p", { className: "has-text-weight-semibold" }, joueurLabel, joueur.mains.length > 1 ? ` \xB7 Main ${index + 1}` : "", " \xB7 ", main.total, " \xB7 Mise ", formatArgent(main.mise ?? 0)), main.resultat && /* @__PURE__ */ React.createElement("span", { className: `tag bj-resultat is-medium ${CLASSES_RESULTAT[main.resultat]}` }, LIBELLES_RESULTAT[main.resultat])));
    })))));
  }
  var SpectateurTable_default = SpectateurTable;

  // src/Pages/GithubCallback.jsx
  var import_react8 = __require("react");
  var import_react_router_dom8 = __require("react-router-dom");
  function GithubCallback({ setIsLoggedIn }) {
    const [searchParams] = (0, import_react_router_dom8.useSearchParams)();
    const navigate = (0, import_react_router_dom8.useNavigate)();
    const dejaTraite = (0, import_react8.useRef)(false);
    const [message, setMessage] = (0, import_react8.useState)(() => verifierRetourGithub(searchParams) ?? "");
    const [inscription, setInscription] = (0, import_react8.useState)(null);
    const [nom, setNom] = (0, import_react8.useState)("");
    const [dateNaissance, setDateNaissance] = (0, import_react8.useState)("");
    function connecter(token) {
      localStorage.setItem("token", token);
      setIsLoggedIn(true);
      navigate("/");
    }
    (0, import_react8.useEffect)(() => {
      if (dejaTraite.current) return;
      dejaTraite.current = true;
      sessionStorage.removeItem(CLE_STATE_GITHUB);
      if (message) return;
      const code = searchParams.get("code");
      (async () => {
        try {
          const response = await fetch(`${API_URL}/auth/github`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code })
          });
          const data = await response.json();
          if (!response.ok) {
            setMessage(data.error || data.message || "Connexion GitHub impossible");
            return;
          }
          if (data.token) {
            connecter(data.token);
            return;
          }
          setInscription(data.tokenInscription);
          setNom(data.nomSuggere ?? "");
        } catch {
          setMessage("Impossible de joindre le serveur. R\xE9essayez plus tard.");
        }
      })();
    }, []);
    async function handleSubmit(event) {
      event.preventDefault();
      setMessage("");
      try {
        const response = await fetch(`${API_URL}/auth/github/inscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenInscription: inscription, nom, date_naissance: dateNaissance })
        });
        const data = await response.json();
        if (!response.ok) {
          setMessage(data.error || data.message || "Erreur lors de l'inscription");
          return;
        }
        connecter(data.token);
      } catch {
        setMessage("Impossible de joindre le serveur. R\xE9essayez plus tard.");
      }
    }
    return /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement("div", { className: "container" }, /* @__PURE__ */ React.createElement("div", { className: "columns is-centered" }, /* @__PURE__ */ React.createElement("div", { className: "column is-one-third" }, /* @__PURE__ */ React.createElement("div", { className: "box" }, /* @__PURE__ */ React.createElement("h1", { className: "title" }, "Connexion GitHub"), inscription ? /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit }, /* @__PURE__ */ React.createElement("p", { className: "mb-4" }, "C'est votre premi\xE8re connexion avec GitHub. Confirmez votre \xE2ge pour pouvoir jouer."), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "github-nom" }, "Nom d'utilisateur"), /* @__PURE__ */ React.createElement("div", { className: "control has-icons-left" }, /* @__PURE__ */ React.createElement("input", { id: "github-nom", className: "input", type: "text", value: nom, onChange: (e) => setNom(e.target.value), required: true }), /* @__PURE__ */ React.createElement("span", { className: "icon is-small is-left" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-user" })))), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", { className: "label", htmlFor: "github-birthdate" }, "Date de naissance"), /* @__PURE__ */ React.createElement("div", { className: "control" }, /* @__PURE__ */ React.createElement("input", { id: "github-birthdate", className: "input", type: "date", value: dateNaissance, onChange: (e) => setDateNaissance(e.target.value), required: true }))), /* @__PURE__ */ React.createElement("button", { className: "button is-primary is-fullwidth", type: "submit" }, "Terminer l'inscription")) : !message && /* @__PURE__ */ React.createElement("p", null, "Connexion en cours\u2026"), message && /* @__PURE__ */ React.createElement("p", { className: "has-text-danger mt-3" }, message), message && !inscription && /* @__PURE__ */ React.createElement(import_react_router_dom8.Link, { className: "button is-light is-fullwidth mt-3", to: "/login" }, "Retour \xE0 la connexion"))))));
  }
  var GithubCallback_default = GithubCallback;

  // src/Routeur.jsx
  function isTokenExpired(token) {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1e3 < Date.now();
  }
  function Routeur() {
    const [isLoggedIn, setIsLoggedIn] = (0, import_react9.useState)(() => {
      const token = localStorage.getItem("token");
      if (!token) return false;
      if (isTokenExpired(token)) {
        localStorage.removeItem("token");
        return false;
      }
      return true;
    });
    const [isSpectateur, setIsSpectateur] = (0, import_react9.useState)(false);
    const [isGuest, setIsGuest] = (0, import_react9.useState)(() => sessionStorage.getItem("guest") === "true");
    const [authModal, setAuthModal] = (0, import_react9.useState)(null);
    return /* @__PURE__ */ React.createElement(import_react_router_dom9.BrowserRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, /* @__PURE__ */ React.createElement(Navbar, { isLoggedIn, setIsLoggedIn, setAuthModal }), /* @__PURE__ */ React.createElement(
      AuthPopup,
      {
        isLoggedIn,
        isGuest,
        setIsGuest,
        setIsLoggedIn,
        setIsSpectateur,
        authModal,
        setAuthModal
      }
    ), /* @__PURE__ */ React.createElement("div", { style: authModal ? { filter: "blur(4px)", pointerEvents: "none" } : {} }, /* @__PURE__ */ React.createElement(import_react_router_dom9.Routes, null, /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/",
        element: isLoggedIn ? /* @__PURE__ */ React.createElement(Salon_default, { setIsLoggedIn, setIsSpectateur, isSpectateur: false }) : isGuest || isSpectateur ? /* @__PURE__ */ React.createElement(Salon_default, { setIsLoggedIn, setIsSpectateur, isSpectateur: true }) : /* @__PURE__ */ React.createElement(Salon_default, { setIsLoggedIn, setIsSpectateur, isSpectateur: false })
      }
    ), /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/login",
        element: isLoggedIn ? /* @__PURE__ */ React.createElement(import_react_router_dom9.Navigate, { to: "/", replace: true }) : /* @__PURE__ */ React.createElement(Login_default, { setIsLoggedIn, setIsSpectateur })
      }
    ), /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/register",
        element: isLoggedIn ? /* @__PURE__ */ React.createElement(import_react_router_dom9.Navigate, { to: "/", replace: true }) : /* @__PURE__ */ React.createElement(Register_default, { setIsLoggedIn })
      }
    ), /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/spectateur",
        element: isGuest || isSpectateur || !isLoggedIn && sessionStorage.getItem("guest") === "true" ? /* @__PURE__ */ React.createElement(Salon_default, { setIsLoggedIn, setIsSpectateur, isSpectateur: true }) : /* @__PURE__ */ React.createElement(import_react_router_dom9.Navigate, { to: "/login", replace: true })
      }
    ), /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/auth/github/callback",
        element: isLoggedIn ? /* @__PURE__ */ React.createElement(import_react_router_dom9.Navigate, { to: "/", replace: true }) : /* @__PURE__ */ React.createElement(GithubCallback_default, { setIsLoggedIn })
      }
    ), /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/compte",
        element: isLoggedIn ? /* @__PURE__ */ React.createElement(Compte, null) : /* @__PURE__ */ React.createElement(import_react_router_dom9.Navigate, { to: "/login", replace: true })
      }
    ), /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/dashboard",
        element: /* @__PURE__ */ React.createElement(import_react_router_dom9.Navigate, { to: "/", replace: true })
      }
    ), /* @__PURE__ */ React.createElement(
      import_react_router_dom9.Route,
      {
        path: "/spectateur/:id",
        element: /* @__PURE__ */ React.createElement(SpectateurTable_default, null)
      }
    ))));
  }
  var Routeur_default = Routeur;
})();
