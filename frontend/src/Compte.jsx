import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000";

export function Compte() {
  const [solde, setSolde] = useState(null);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");

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
  }, [token]);

  return (
    <section className="section is-flex is-flex-direction-column is-align-items-center has-text-centered">
      <h1 className="title is-2 mb-5">Mon Compte</h1>
      <div>
        <div className="box" style={{ width: "400px" }}>
          <h2 className="title is-4">Votre solde</h2>
          <p className="title is-3">
            {solde === null ? "--" : `${Number(solde).toFixed(2)} $`}
          </p>
          {(message || !token) && (
            <p className="help is-danger">
              {message || "Connectez-vous pour afficher votre solde."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}