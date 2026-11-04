(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/Pages/Register.jsx
  var import_react = __require("react");
  var import_react_router_dom = __require("react-router-dom");
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
    const navigate = (0, import_react_router_dom.useNavigate)();
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
})();
