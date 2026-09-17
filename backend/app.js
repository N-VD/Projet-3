const express = require('express');
const app = express();
const port = process.env.PORT ?? 3000;

const path = require("path");
const comptesRouter = require('./Comptes/Comptes');

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Serveur fonctionne");
});



app.use(comptesRouter);

app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
});