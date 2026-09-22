import { useState } from "react";
import { Compte } from "./Compte.jsx";

function App() {
  const [showAccount, setShowAccount] = useState(false);

  if (showAccount) {
    return <Compte />;
  }

  return (
    <main className="section is-flex is-justify-content-center">
      <button className="button is-primary is-medium" type="button" onClick={() => setShowAccount(true)}>
        Compte
      </button>
    </main>
  );
}

export default App;
