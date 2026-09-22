import { useState } from "react";

function Register() {
  const [form, setForm] = useState({ nom: "", password: "", date_naissance: "", email: "", role: "player", montant: 0 });
  const [message, setMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, montant: Number(form.montant) }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Compte créé avec succès !" : data.error || data.message || "Erreur lors de l'inscription");
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="title">Inscription</h1>
        <form onSubmit={handleSubmit}>
          <div className="field"><label className="label" htmlFor="register-name">Nom d'utilisateur</label><input id="register-name" className="input" name="nom" type="text" value={form.nom} onChange={updateField} required /></div>
          <div className="field"><label className="label" htmlFor="register-password">Mot de passe</label><input id="register-password" className="input" name="password" type="password" value={form.password} onChange={updateField} required /></div>
          <div className="field"><label className="label" htmlFor="register-date">Date de naissance</label><input id="register-date" className="input" name="date_naissance" type="date" value={form.date_naissance} onChange={updateField} required /></div>
          <div className="field"><label className="label" htmlFor="register-email">Email</label><input id="register-email" className="input" name="email" type="email" value={form.email} onChange={updateField} required /></div>
          <div className="field"><label className="label" htmlFor="register-role">Rôle</label><div className="select"><select id="register-role" name="role" value={form.role} onChange={updateField}><option value="player">player</option><option value="admin">admin</option></select></div></div>
          <div className="field"><label className="label" htmlFor="register-amount">Montant de départ</label><input id="register-amount" className="input" name="montant" type="number" value={form.montant} onChange={updateField} /></div>
          <button className="button is-primary" type="submit">S'inscrire</button>
          {message && <p className="mt-3">{message}</p>}
        </form>
      </div>
    </section>
  );
}

export default Register;
