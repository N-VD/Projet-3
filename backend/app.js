const fs = require('fs');
const path = require('path');

// 1. Détection et création du fichier .env à la racine
const envPath = path.join(__dirname, '..', '.env');

try {
    if (!fs.existsSync(envPath)) {
        const defaultEnvContent = `DB_USER=admin
DB_PASSWORD=bellevibe_casino
DB_NAME=myapp
PORT=3000
`;
        fs.writeFileSync(envPath, defaultEnvContent, 'utf8');
        console.log(" Fichier .env absent : créé automatiquement à la racine du projet !");
    }
} catch (err) {
    // Évite de faire planter Node si Docker restreint l'écriture hors de /app
    console.log("ℹ Impossibilité d'écrire le .env sur le disque hôte (géré en mémoire par Docker).");
}

require('dotenv').config({ path: envPath });
const express = require('express');
const app = express();
const port = process.env.PORT ?? 3000;
const mongoose = require('mongoose');//ajout
const cors = require('cors');
const bcrypt = require('bcryptjs');



const Compte = require('./models/Compte');



const comptesRouter = require('./Routes/Comptes');
const portefeuilleRouter = require('./Routes/Portefeuille');
const blackjackRouter = require('./Routes/Blackjack');
const creationSalonRouter = require('./Routes/Salon');



app.use(cors());
app.use(express.json());



// Fonction d'initialisation automatique des comptes
async function initComptesAutomatiques() {
    try {
        const nbComptes = await Compte.countDocuments();

        if (nbComptes === 0) {
            console.log("  création automatique des comptes de démonstration");

            const hashedPassword = await bcrypt.hash('12345678!', 10);

            await Compte.insertMany([
                {
                    nom: 'JoueurTest',
                    email: 'player@bellevibe.com',
                    password: hashedPassword,
                    date_naissance: new Date('2000-01-01'),
                    role: 'player',
                    montant: 1000
                },
                {
                    nom: 'CroupierTest',
                    email: 'dealer@bellevibe.com',
                    password: hashedPassword,
                    date_naissance: new Date('1995-05-15'),
                    role: 'dealer',
                    montant: 0  
                }
            ]);

            console.log(" Comptes Player et Dealer créés automatiquement !");
        } else {
            console.log("ℹ Des comptes existent déjà dans la base de données.");
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation des comptes :", error);
    }
}

// ajout de la connexion
// Connexion Mongoose pour exécution hors Docker (en local)
const mongoUser = encodeURIComponent(process.env.DB_USER || 'admin');
const mongoPassword = encodeURIComponent(process.env.DB_PASSWORD || '');
const mongoDatabase = process.env.DB_NAME || 'myapp';
const mongoURI = process.env.MONGO_URI
    || `mongodb://${mongoUser}:${mongoPassword}@127.0.0.1:27017/${mongoDatabase}?authSource=admin`;

mongoose.connect(mongoURI)
    .then(async() => {
        console.log("Connecté à MongoDB via Docker avec succès !");
        await initComptesAutomatiques();
    })
    .catch((err) => console.error("Erreur de connexion MongoDB :", err));



app.get("/", (req, res) => {
    res.send("Serveur fonctionne");
});



app.use(comptesRouter);
app.use(portefeuilleRouter);
app.use(blackjackRouter);
app.use(creationSalonRouter);

app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
});