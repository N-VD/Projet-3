const express = require('express');
const app = express();
const port = process.env.PORT ?? 3000;
const mongoose = require('mongoose');//ajout
const cors = require('cors');



const path = require("path");
const comptesRouter = require('./Comptes/Comptes');



app.use(cors());
app.use(express.json());

// ajout de la connexion
// Connexion Mongoose pour exécution hors Docker (en local)
const mongoURI = process.env.MONGO_URI || 'mongodb://admin:test@127.0.0.1:27017/projet3_db?authSource=admin';

mongoose.connect(mongoURI)
    .then(() => console.log("Connecté à MongoDB via Docker avec succès !"))
    .catch((err) => console.error("Erreur de connexion MongoDB :", err));



app.get("/", (req, res) => {
    res.send("Serveur fonctionne");
});



app.use(comptesRouter);

app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
});