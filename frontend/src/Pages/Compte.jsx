import { useEffect, useState } from "react";

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

export default function Compte() {

  // Déclaration des états pour le solde, le nom de l'utilisateur et les messages d'erreur
  const [solde, setSolde] = useState(null);
  const [nom, setNom] = useState("");
  const [nouveauNom, setNouveauNom] = useState("");
  const [afficherModificationNom, setAfficherModificationNom] = useState(false);
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [afficherModificationMotDePasse, setAfficherModificationMotDePasse] = useState(false);
  const [message, setMessage] = useState("");
  const [montantAjout, setMontantAjout] = useState("");
  const [afficherAjout, setAfficherAjout] = useState(false);
  const [montantRetrait, setMontantRetrait] = useState("");
  const [afficherRetrait, setAfficherRetrait] = useState(false);
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
  const validerAjout = async (event) => {
    event.preventDefault();
    const montant = Number(montantAjout);

    if (!Number.isFinite(montant) || montant <= 0) {
      setMessage("Veuillez entrer un montant supérieur à zéro.");
      return;
    }

    if (await ajouterArgent(montant)) {
      setMontantAjout("");
      setAfficherAjout(false);
    }
  };

  // Fonction pour valider le retrait d'argent
  const validerRetrait = async (event) => {
    event.preventDefault();
    const montant = Number(montantRetrait);

    if (!Number.isFinite(montant) || montant <= 0) {
      setMessage("Veuillez entrer un montant supérieur à zéro.");
      return;
    }

    if (await retirerArgent(montant)) {
      setMontantRetrait("");
      setAfficherRetrait(false);
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
    setAfficherAjout(formulaire === "ajout");
    setAfficherRetrait(formulaire === "retrait");
  };

  // Rendu du composant
  return (
    <section className="section is-flex is-flex-direction-column is-align-items-center has-text-centered">
      <h1 className="title is-2 mb-5">Bienvenue, {nom}!</h1>
      <div
        className="is-flex is-flex-direction-column-mobile is-align-items-center is-justify-content-center"
        style={{ "4rem" : "0", width: "100%" }}
      >
        <div style={{ width: "min(900px, 90vw)" }}>
          <div
            className={`is-flex is-justify-content-center is-align-items-center is-flex-wrap-wrap ${
              afficherModificationNom || afficherModificationMotDePasse ? "mb-0" : "mb-6"
            }`}
            style={{ width: "100%", gap: "0.75rem" }}
          >
            {!afficherModificationNom && (
              <button
                className="button is-primary"
                type="button"
                onClick={() => {
                  setNouveauNom(nom);
                  ouvrirFormulaire("nom");
                  setMessage("");
                }}
              >
                Modifier le nom d'utilisateur
              </button>
            )}
            {!afficherModificationMotDePasse && (
              <button
                className="button is-primary"
                type="button"
                onClick={() => {
                  ouvrirFormulaire("motDePasse");
                  setMessage("");
                }}
              >
                Modifier le mot de passe
              </button>
            )}
          </div>
          {afficherModificationNom ? (
            <div className="box" style={{ width: "min(520px, 90vw)", margin: "1rem auto" }}>
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
                  <button className="button is-primary" type="submit">Valider</button>
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
            <div className="box" style={{ width: "min(520px, 90vw)", margin: "1rem auto" }}>
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
                  <button className="button is-primary" type="submit">Valider</button>
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
          {!afficherAjout && !afficherRetrait && (
            <h1 className="title is-2 mb-5">Votre solde</h1>
          )}
          <div className="box" style={{ width: "min(520px, 90vw)", margin: "0 auto" }}>
            {afficherAjout ? (
              <form onSubmit={validerAjout}>
                <h2 className="title is-4">Ajouter de l'argent</h2>
                <div className="field">
                  <label className="label" htmlFor="montant-ajout">Montant à ajouter</label>
                  <div className="control">
                    <input
                      id="montant-ajout"
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={montantAjout}
                      onChange={(event) => setMontantAjout(event.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="buttons is-centered mb-0">
                  <button className="button is-primary" type="submit">Valider</button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setAfficherAjout(false);
                      setMessage("");
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : afficherRetrait ? (
              <form onSubmit={validerRetrait}>
                <h2 className="title is-4">Retirer de l'argent</h2>
                <div className="field">
                  <label className="label" htmlFor="montant-retrait">Montant à retirer</label>
                  <div className="control">
                    <input
                      id="montant-retrait"
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={montantRetrait}
                      onChange={(event) => setMontantRetrait(event.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="buttons is-centered mb-0">
                  <button className="button is-danger" type="submit">Valider</button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setAfficherRetrait(false);
                      setMessage("");
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="title is-3">
                  {solde === null ? "--" : `${Number(solde).toFixed(2)} $`}
                </p>
              </>
            )}
            {message && <p className="has-text-danger mt-3">{message}</p>}
          </div>
          <div
            className="is-flex is-justify-content-center is-align-items-center is-flex-wrap-wrap mt-3"
            style={{ width: "100%", gap: "0.75rem" }}
          >
            <button
              className="button is-primary"
              type="button"
              onClick={() => ouvrirFormulaire("ajout")}
            >
              Ajouter de l'argent
            </button>
            <button
              className="button is-danger"
              type="button"
              onClick={() => ouvrirFormulaire("retrait")}
            >
              Retirer de l'argent
            </button>
          </div>
          <h1 className="title is-2 mt-6 mb-5">Historique des transactions</h1>
          <div className="box mt-5" style={{ width: "100%" }}>
            {transactions.length === 0 ? (
              <p>Aucune transaction pour le moment.</p>
            ) : (
              <div className="table-container">
                <table className="table is-fullwidth is-striped">
                  <thead>
                    <tr>
                      <th className="has-text-left">Date</th>
                      <th className="has-text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction._id}>
                        <td className="has-text-left">
                          {formaterDateTransaction(transaction.created_at)}
                        </td>
                        <td className={`has-text-right ${transaction.montant > 0 ? "has-text-success" : "has-text-danger"}`}>
                          {transaction.montant > 0 ? "+" : ""}
                          {Number(transaction.montant).toFixed(2)} $
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}