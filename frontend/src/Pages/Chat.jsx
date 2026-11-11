import { useEffect, useRef, useState } from "react";
import { connecterSocket } from "../services/socket.js";
import { lireUtilisateur } from "./reglesBlackjack/outils.js";
import "./Blackjack.css";

const COULEURS = [
  "#ff4500",
  "#1e90ff",
  "#9acd32",
  "#ff69b4",
  "#daa520",
  "#00ced1",
  "#b22222",
  "#8a2be2",
];
const couleurPour = (nom) =>
  COULEURS[[...nom].reduce((a, c) => a + c.charCodeAt(0), 0) % COULEURS.length];

function Chat({ salonId }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const finRef = useRef(null);
  const connecte = Boolean(lireUtilisateur().nom);

  useEffect(() => {
    const socket = connecterSocket();
    const rejoindre = () => socket.emit("chat_rejoindre", salonId);
    const ajouter = (msg) => setMessages((prev) => [...prev.slice(-99), msg]);
    const surErreur = (e) => {
      setErreur(e);
      setTimeout(() => setErreur(""), 3000);
    };

    rejoindre();
    socket.on("connect", rejoindre); // re-rejoindre après une reconnexion
    socket.on("chat_historique", setMessages);
    socket.on("chat_message", ajouter);
    socket.on("chat_erreur", surErreur);

    return () => {
      socket.emit("chat_quitter", salonId);
      socket.off("connect", rejoindre);
      socket.off("chat_historique", setMessages);
      socket.off("chat_message", ajouter);
      socket.off("chat_erreur", surErreur);
    };
  }, [salonId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const envoyer = (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    connecterSocket().emit("chat_envoyer", {
      salonId,
      texte,
      token: localStorage.getItem("token"),
    });
    setTexte("");
  };

  return (
    <aside className="chat">
      <header className="chat-entete">Chat de la table</header>
      <ul className="chat-messages">
        {messages.map((m) => (
          <li key={m._id}>
            {m.role === "dealer" && (
              <span className="tag is-warning is-small mr-1">Croupier</span>
            )}
            <strong style={{ color: couleurPour(m.nom) }}>{m.nom}</strong>:{" "}
            {m.texte}
          </li>
        ))}
        <li ref={finRef} />
      </ul>
      {erreur && <p className="chat-erreur">{erreur}</p>}
      <form className="chat-form" onSubmit={envoyer}>
        <input
          className="input is-small"
          maxLength={200}
          value={texte}
          disabled={!connecte}
          placeholder={
            connecte ? "Envoyer un message" : "Connecte-toi pour discuter"
          }
          onChange={(e) => setTexte(e.target.value)}
        />
        <button className="button is-small is-link" disabled={!connecte}>
          Chat
        </button>
      </form>
    </aside>
  );
}

export default Chat;
