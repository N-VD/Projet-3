const express = require('express');
const app = express();
const port = process.env.PORT ?? 3000;
const mongoose = require('mongoose');//ajout
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });



const comptesRouter = require('./Routes/Comptes');
const portefeuilleRouter = require('./Routes/Portefeuille');



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

app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
});