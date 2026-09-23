import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000";

export default function Compte() {

  // Déclaration des états pour le solde, le nom de l'utilisateur et les messages d'erreur
  const [solde, setSolde] = useState(null);
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("");
  const [montantAjout, setMontantAjout] = useState("");
  const [afficherAjout, setAfficherAjout] = useState(false);
  const [montantRetrait, setMontantRetrait] = useState("");
  const [afficherRetrait, setAfficherRetrait] = useState(false);
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

  // Déterminer l'image à afficher en fonction du solde. (Vraiment facultatif mais je m'amuse)
  const soldeNumerique = Number(solde);
  const imageSolde = soldeNumerique >= 200
    ? {
        src: "/vecteezy_stacks-of-casino-poker-chips-in-green-red-and-blue-colors_56608924.png",
        alt: "Piles de jetons de poker colorés",
      }
    : soldeNumerique > 100
      ? {
          src: "/vecteezy_image-of-a-stack-of-casino-poker-chips-on-a-transparent_67221594.png",
          alt: "Pile de jetons de poker",
        }
      : soldeNumerique > 0
        ? {
            src: "/vecteezy_a-vibrant-stack-of-poker-chips-with-a-solitary-red-chip_53134426.png",
            alt: "Pile de jetons de poker avec un jeton rouge",
          }
        : null;

  // Rendu du composant
  return (
    <section className="section is-flex is-flex-direction-column is-align-items-center has-text-centered">
      <h1 className="title is-2 mb-5">Bienvenue, {nom}!</h1>
      <div
        className="is-flex is-flex-direction-column-mobile is-align-items-center is-justify-content-center"
        style={{ gap: imageSolde ? "4rem" : "0", width: "100%" }}
      >
        {imageSolde && (
          <img
            src={imageSolde.src}
            alt={imageSolde.alt}
            style={{ width: "420px", maxWidth: "90vw", height: "auto" }}
          />
        )}
        <div style={{ width: "min(520px, 90vw)" }}>
        <div className="box" style={{ width: "100%" }}>
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
              <h2 className="title is-4">Votre solde</h2>
              <p className="title is-3">
                {solde === null ? "--" : `${Number(solde).toFixed(2)} $`}
              </p>
            </>
          )}
          {message && <p className="has-text-danger mt-3">{message}</p>}
        </div>
        <div className="buttons is-centered" style={{ width: "100%" }}>
          <button
            className="button is-primary"
            onClick={() => {
              setAfficherAjout(true);
              setAfficherRetrait(false);
            }}
          >
            Ajouter de l'argent
          </button>
          <button
            className="button is-danger"
            onClick={() => {
              setAfficherRetrait(true);
              setAfficherAjout(false);
            }}
          >
            Retirer de l'argent
          </button>
        </div>
        </div>
      </div>
    </section>
  );
}