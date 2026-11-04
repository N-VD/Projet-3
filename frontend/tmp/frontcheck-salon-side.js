(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/Pages/Salon.jsx
  var import_react2 = __require("react");
  var import_react_router_dom = __require("react-router-dom");

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
  var import_react = __require("react");

  // src/Pages/reglesBlackjack/constantes.js
  var API_URL = "http://localhost:3000";
  var COULEURS = ["pique", "coeur", "carreau", "trefle"];
  var RANGS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var SYMBOLES = { pique: "\u2660", coeur: "\u2665", carreau: "\u2666", trefle: "\u2663" };
  var SIEGE_INACTIF = 6;
  var PAS_DISTRIBUTION = 0.22;
  var DUREE_DISTRIBUTION = 0.45;
  var DUREE_RETOURNEMENT = 0.6;

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

  // src/Pages/Blackjack.jsx
  function memeIdentifiant(premier, second) {
    return premier != null && second != null && String(premier) === String(second);
  }
  function Blackjack({ salon, setSalon, setIsLoggedIn, retourAuxSalons }) {
    const utilisateur = lireUtilisateur();
    const idUtilisateur = utilisateur.id ?? utilisateur._id;
    const [mise, setMise] = (0, import_react.useState)(10);
    const [solde, setSolde] = (0, import_react.useState)(null);
    const [sabot, setSabot] = (0, import_react.useState)([]);
    const [resultats, setResultats] = (0, import_react.useState)({});
    const [message, setMessage] = (0, import_react.useState)("");
    const [chargement, setChargement] = (0, import_react.useState)(false);
    const [compteRebours, setCompteRebours] = (0, import_react.useState)(null);
    const lancementAutomatique = (0, import_react.useRef)(null);
    const minuterieAnimation = (0, import_react.useRef)(null);
    const [planAnimation, setPlanAnimation] = (0, import_react.useState)(null);
    const [enAnimation, setEnAnimation] = (0, import_react.useState)(false);
    (0, import_react.useEffect)(() => () => window.clearTimeout(minuterieAnimation.current), []);
    (0, import_react.useEffect)(() => {
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
    const salonRef = (0, import_react.useRef)(salon);
    (0, import_react.useEffect)(() => {
      salonRef.current = salon;
    }, [salon]);
    (0, import_react.useEffect)(() => {
      lancementAutomatique.current = () => {
        const salonActuel = salonRef.current;
        if (!salonActuel) return;
        distribuer();
      };
    }, []);
    (0, import_react.useEffect)(() => {
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
    (0, import_react.useEffect)(() => {
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
    const navigate = (0, import_react_router_dom.useNavigate)();
    const utilisateur = lireUtilisateur();
    const idUtilisateur = utilisateur.id ?? utilisateur._id;
    const role = utilisateur.role?.toLowerCase();
    const estDealer = role === "dealer" || role === "admin";
    const [salon, setSalon] = (0, import_react2.useState)(null);
    const [salons, setSalons] = (0, import_react2.useState)([]);
    const [chargement, setChargement] = (0, import_react2.useState)(false);
    const [message, setMessage] = (0, import_react2.useState)("");
    (0, import_react2.useEffect)(() => {
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
      ) : /* @__PURE__ */ React.createElement("div", { className: "buttons is-centered", style: { marginBottom: 0, display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: "0.5rem", width: "100%", alignItems: "stretch" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button is-warning",
          style: { flex: "0 0 85%", minWidth: 0, width: "85%" },
          onClick: () => rejoindreSalon(salonDisponible),
          disabled: chargement || !joueurExistant && (salonDisponible.status !== "waiting" || placesLibres === 0)
        },
        joueurExistant ? "Revenir au salon" : "Jouer"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "button is-light",
          style: { flex: "0 0 15%", minWidth: 0, width: "15%", paddingLeft: "0.35rem", paddingRight: "0.35rem" },
          onClick: () => {
            setIsSpectateur(true);
            navigate("/spectateur");
          },
          disabled: chargement,
          "aria-label": "Regarder le salon"
        },
        /* @__PURE__ */ React.createElement("span", { className: "icon is-small" }, /* @__PURE__ */ React.createElement("i", { className: "fas fa-eye" }))
      ));
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
})();
