(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/Pages/Navbar.jsx
  var import_react = __require("react");
  var import_react_router_dom = __require("react-router-dom");

  // src/Pages/reglesBlackjack/constantes.js
  var API_URL = "http://localhost:3000";

  // src/Pages/Navbar.jsx
  function Navbar({ isLoggedIn, setIsLoggedIn }) {
    const location = (0, import_react_router_dom.useLocation)();
    const isComptePage = location.pathname === "/compte";
    const [solde, setSolde] = (0, import_react.useState)(null);
    (0, import_react.useEffect)(() => {
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
        import_react_router_dom.Link,
        {
          to: "/",
          className: "navbar-item navbar-brand-link has-text-weight-bold has-text-white",
          style: { fontSize: "1.7rem", letterSpacing: "0.04em" }
        },
        "BelleVibe Casino"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "navbar-end" }, isLoggedIn && solde !== null && /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("span", { className: "tag is-success is-medium", style: { fontSize: "0.95rem" } }, /* @__PURE__ */ React.createElement("span", { className: "icon" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-coins" })), /* @__PURE__ */ React.createElement("span", null, "Solde : ", formatArgent(solde)))), isLoggedIn ? /* @__PURE__ */ React.createElement(React.Fragment, null, !isComptePage && /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("button", { className: "button is-light", onClick: () => window.location.href = "/compte" }, "Compte")), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement(import_react_router_dom.Link, { to: "/spectateur", className: "button is-light" }, "Spectateur")), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement("button", { className: "button is-light", onClick: handleLogout }, "Se d\xE9connecter"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement(import_react_router_dom.Link, { to: "/register", className: "button is-light" }, "S'inscrire")), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, /* @__PURE__ */ React.createElement(import_react_router_dom.Link, { to: "/login", className: "button is-light" }, "Se connecter"))), /* @__PURE__ */ React.createElement("div", { className: "navbar-item" }, isLoggedIn ? /* @__PURE__ */ React.createElement("span", { className: "tag is-success" }, "Connect\xE9") : /* @__PURE__ */ React.createElement("span", { className: "tag is-warning" }, "Non connect\xE9")))
    ));
  }
})();
