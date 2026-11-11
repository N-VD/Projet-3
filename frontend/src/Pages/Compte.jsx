import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notifierSoldeMisAJour } from "../services/solde.js";
const API_URL = "http://localhost:3000";

// Fonction pour formater la date d'une transaction, purement utile pour l'affichage, ne modifie pas la date originale
function formaterDateTransaction(valeur) {
  const date = new Date(valeur);
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  const heure = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${annee}-${mois}-${jour}, ${heure}h${minutes}`;
}

// Fonction pour récupérer l'historique des transactions
async function recupererTransactions(token) {
  const response = await fetch(`${API_URL}/transactions`, {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Impossible de charger l'historique des transactions.");
  }
  return data.transactions;
}

export default function Compte({ setSoldeGlobal }) {

  // Déclaration des états pour le solde, le nom de l'utilisateur et les messages d'erreur
  const navigate = useNavigate();
  const [solde, setSolde] = useState(null);
  const [modifierSolde, setModifierSolde] = useState(false);
  const [nom, setNom] = useState("");
  const [nouveauNom, setNouveauNom] = useState("");
  const [afficherModificationNom, setAfficherModificationNom] = useState(false);
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [afficherModificationMotDePasse, setAfficherModificationMotDePasse] = useState(false);
  const [message, setMessage] = useState("");
  const [montantArgent, setMontantArgent] = useState("");
  const [transactions, setTransactions] = useState([]);
  const token = localStorage.getItem("token");

  // Fonction pour ajouter de l'argent au compte
  const ajouterArgent = async (montant) => {
    if (!token) {
      setMessage("Vous devez être connecté pour effectuer cette action.");
      return false;
    }
    try {
      const response = await fetch(`${API_URL}/ajouterArgent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ montant }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible d'ajouter de l'argent.");
      setSolde(data.compte.montant);
      setSoldeGlobal(data.compte.montant);
      notifierSoldeMisAJour(data.compte.montant);
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

  // Fonction pour retirer de l'argent du compte
  const retirerArgent = async (montant) => {
    if (!token) {
      setMessage("Vous devez être connecté pour effectuer cette action.");
      return false;
    }
    try {
      const response = await fetch(`${API_URL}/retirerArgent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ montant }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de retirer de l'argent.");
      setSolde(data.compte.montant);
      setSoldeGlobal(data.compte.montant);
      notifierSoldeMisAJour(data.compte.montant);
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

  // Fonction pour modifier le nom d'utilisateur de l'utilisateur
  const modifierNomUtilisateur = async (nom) => {
    if (!token) {
      setMessage("Vous devez être connecté pour effectuer cette action.");
      return false;
    }
    try {
      const response = await fetch(`${API_URL}/modifierNomUtilisateur`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nom }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de modifier le nom d'utilisateur");
      setNom(nom);
      setMessage("");
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  };

  // Fonction pour modifier le mot de passe de l'utilisateur
  const modifierMotDePasse = async () => {
    if (!token) {
      setMessage("Vous devez être connecté pour effectuer cette action.");
      return false;
    }
    try {
      const response = await fetch(`${API_URL}/modifierMotDePasse`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ motDePasseActuel, nouveauMotDePasse }),
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

  // Fetch le solde et les informations du compte connecté lors du montage du composant
  useEffect(() => {
    if (!token) {
      return;
    }

    fetch(`${API_URL}/solde`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible de charger le solde.");
        setSolde(data.solde);
      })
      .catch((error) => setMessage(error.message));

    fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Impossible de charger les informations du compte.");
        setNom(data.nom);
      })
      .catch((error) => setMessage(error.message));

    recupererTransactions(token)
      .then(setTransactions)
      .catch((error) => setMessage(error.message));
  }, [token]);


  // Fonction pour valider l'ajout d'argent
  const validerArgent = async (typeAction) => {
    const montant = Number(montantArgent);

    if (!Number.isFinite(montant) || montant <= 0) {
      setMessage("Veuillez entrer un montant supérieur à zéro.");
      return;
    }

    const succes = typeAction === "ajout"
      ? await ajouterArgent(montant)
      : await retirerArgent(montant);

    if (succes) {
      setMontantArgent("");
      setAfficherActionArgent(false);
    }
  };

  // Fonction pour valider le nom d'utilisateur
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

  // Fonction pour valider mot de passe
  const validerMotDePasse = async (event) => {
    event.preventDefault();

    if (await modifierMotDePasse()) {
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setAfficherModificationMotDePasse(false);
    }
  };

  // Fonction pour ouvrir le formulaire de modification du nom d'utilisateur ou du mot de passe
  const ouvrirFormulaire = (formulaire) => {
    setAfficherModificationNom(formulaire === "nom");
    setAfficherModificationMotDePasse(formulaire === "motDePasse");
    setModifierSolde(formulaire === "argent");
  };

  // Rendu du composant
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 40,
      }}
    >
      <div className="box" style={{ border: "1px solid #d6d6d6", borderRadius: "16px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)", padding: "1.5rem", width: "100%", maxWidth: "520px", transition: "all 0.2s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", gap: "12px" }}>
          <h1 className="title" style={{ margin: 0 }}>
            Bonjour, {nom}
          </h1>
          <span className="tag is-success is-medium">
            <span className="icon"><i className="fas fa-coins" /></span>
            <span>Solde : {solde !== null ? `${Number(solde).toFixed(2)} $` : "0.00 $"}</span>
          </span>
        </div>
        {!afficherModificationNom && !afficherModificationMotDePasse && !modifierSolde && (
          <h2 className="subtitle">Choisir une option</h2>
        )}
        {!afficherModificationNom && !afficherModificationMotDePasse && !modifierSolde && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              className="button"
              style={{ background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }}
              type="button"
              onClick={() => {
                setAfficherModificationNom(true);
                setAfficherModificationMotDePasse(false);
              }}
            >
              Modifier le nom d'utilisateur
            </button>

            <button
              className="button"
              style={{ background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }}
              type="button"
              onClick={() => {
                setAfficherModificationMotDePasse(true);
                setAfficherModificationNom(false);
              }}
            >
              Modifier le mot de passe
            </button>
            <button
              className="button"
              style={{ background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }}
              type="button"
              onClick={() => {
                setModifierSolde(true);
                setMontantArgent("");
                setMessage("");
              }}
            >
              Ajouter/retirer de l'argent
            </button>
            <button className="button is-dark" type="button">
              Supprimer le compte
            </button>
          </div>
        )}
        {afficherModificationNom ? (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #d6d6d6" }}>
            <form onSubmit={validerNomUtilisateur}>
              <h2 className="title is-4">Modifier le nom d'utilisateur</h2>
              <div className="field">
                <label className="label" htmlFor="nouveau-nom">Nouveau nom d'utilisateur</label>
                <div className="control">
                  <input
                    id="nouveau-nom"
                    className="input"
                    type="text"
                    value={nouveauNom}
                    onChange={(event) => setNouveauNom(event.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="buttons is-centered mb-0">
                <button className="button" style={{ background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }} type="submit">
                  Valider
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setAfficherModificationNom(false);
                    setNouveauNom("");
                    setMessage("");
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : null}
        {afficherModificationMotDePasse ? (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #d6d6d6" }}>
            <form onSubmit={validerMotDePasse}>
              <h2 className="title is-4">Modifier le mot de passe</h2>
              <div className="field">
                <label className="label" htmlFor="mot-de-passe-actuel">Mot de passe actuel</label>
                <div className="control">
                  <input
                    id="mot-de-passe-actuel"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={motDePasseActuel}
                    onChange={(event) => setMotDePasseActuel(event.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="nouveau-mot-de-passe">Nouveau mot de passe</label>
                <div className="control">
                  <input
                    id="nouveau-mot-de-passe"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    value={nouveauMotDePasse}
                    onChange={(event) => setNouveauMotDePasse(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="buttons is-centered mb-0">
                <button className="button" style={{ background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }} type="submit">
                  Valider
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setAfficherModificationMotDePasse(false);
                    setMotDePasseActuel("");
                    setNouveauMotDePasse("");
                    setMessage("");
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : null}
        {modifierSolde && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #d6d6d6" }}>
            <h2 className="title is-4">Ajouter ou retirer de l'argent</h2>
            <div className="field">
              <label className="label" htmlFor="montant-argent">Montant</label>
              <div className="control">
                <input
                  id="montant-argent"
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={montantArgent}
                  onChange={(event) => setMontantArgent(event.target.value)}
                  autoFocus
                  required
                />
              </div>
              {message && <p className="help is-danger" style={{ marginTop: "0.5rem" }}>{message}</p>}
            </div>
            <div className="buttons is-centered mb-0">
              <button
                className="button"
                style={{ background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" }}
                type="button"
                onClick={() => validerArgent("ajout")}
              >
                Ajouter
              </button>
              <button
                className="button"
                style={{ background: "#dc3545", borderColor: "#dc3545", color: "#fff" }}
                type="button"
                onClick={() => validerArgent("retrait")}
              >
                Retirer
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  setModifierSolde(false);
                  setMontantArgent("");
                  setMessage("");
                }}
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
