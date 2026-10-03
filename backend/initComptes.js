const bcrypt = require('bcryptjs');
const Compte = require('./models/Compte');

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

module.exports = initComptesAutomatiques;