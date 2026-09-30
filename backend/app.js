const express = require('express');
const app = express();
const port = process.env.PORT ?? 3000;
const mongoose = require('mongoose');//ajout
const cors = require('cors');



const comptesRouter = require('./Routes/Comptes');
const portefeuilleRouter = require('./Routes/Portefeuille');
const blackjackRouter = require('./Routes/Blackjack');
const creationSalonRouter = require('./Routes/Salon');
const liveRouter = require('./Routes/Live');
const tableLive = require('./jeux/tableLive');



app.use(cors());
app.use(express.json());

// ajout de la connexion
// Connexion Mongoose pour exécution hors Docker (en local)
const mongoUser = encodeURIComponent(process.env.DB_USER || 'admin');
const mongoPassword = encodeURIComponent(process.env.DB_PASSWORD || '');
const mongoDatabase = process.env.DB_NAME || 'myapp';
const mongoURI = process.env.MONGO_URI
    || `mongodb://${mongoUser}:${mongoPassword}@127.0.0.1:27017/${mongoDatabase}?authSource=admin`;

mongoose.connect(mongoURI)
    .then(() => console.log("Connecté à MongoDB via Docker avec succès !"))
    .catch((err) => console.error("Erreur de connexion MongoDB :", err));



app.get("/", (req, res) => {
    res.send("Serveur fonctionne");
});



app.use(comptesRouter);
app.use(portefeuilleRouter);
app.use(blackjackRouter);
app.use(creationSalonRouter);
app.use(liveRouter);

// Table de blackjack live : reprend la manche sauvegardée et fait avancer les chronos
tableLive.demarrer().catch((err) => console.error("Erreur au démarrage de la table live :", err));

app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
});