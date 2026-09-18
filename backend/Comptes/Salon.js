const express = require('express');
const { authentifier } = require('../fonctionsCommunes');
const Salon = require('../models/salon');
const router = express.Router();

// Routes
// Routes Pour crée un Salon
router.post('/createSalon', authentifier, async (req, res) => {
    const role = req.user?.role?.toLowerCase();
    // Seul un compte avec un role dealer (ou admin) peut crée des salons
    if (role !== 'dealer' && role !== 'admin') {
        return res.status(403).json({ message: "Accès refusé. Seul un dealer peut créer un salon." });
    }

    try {
        // Aucune main n'existe lors de la création et aucun joueur n'est encore connecté
        const salon = await Salon.create({
            status: 'waiting',
            dealer_hand: [],
            deck: [],
            players: [],
            currentTurnSeat: 0
        });

        return res.status(201).json({ message: 'Salon créé', salon });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur lors de la création du salon' });
    }
});

//Route pour que un joueur puis rejoindre un salon il doit avoir le role player
router.post('/addPlayer', authentifier, async (req, res) => {
    
    const { salonId, seat_index } = req.body;
    const role = req.user?.role?.toLowerCase();

    // Les compte avec le rôle de dealer ne peuvent pas participer au jeux
    if (role !== 'player') {
        return res.status(403).json({ message: "Accès refusé. Seul un joueur peut rejoindre un salon." });
    }

    // S'assurer que le salon existe belle et bien
    if (!salonId || !Number.isInteger(seat_index) || seat_index < 0) {
        return res.status(400).json({ message: 'salonId et seat_index sont obligatoires.' });
    }

    try {
        const salon = await Salon.findById(salonId);
        // Le salon doit exister pour rejoindre
        if (!salon) {
            return res.status(404).json({ message: 'Salon non trouvé.' });
        }

        // Une table peut accueillir au maximum six joueurs
        if (salon.players.length >= 6) {
            return res.status(409).json({ message: 'Ce salon est complet.' });
        }
        
        // Un joueur ne peut pas rejoindre un partie au milieur d'une manche
        if (salon.status !== 'waiting') {
            return res.status(409).json({ message: 'Ce salon n’accepte pas de joueurs pour le moment.' });
        }

        // Un joueur qui est déja dans le salon ne peut pas rejoindre le salon
        if (salon.players.some((player) => player.id_compte.toString() === req.user.id)) {
            return res.status(409).json({ message: 'Vous êtes déjà dans ce salon.' });
        }

        // Un joueur ne peut pas rejoinde un siege déja occupé
        if (salon.players.some((player) => player.seat_index === seat_index)) {
            return res.status(409).json({ message: 'Cette place est déjà occupée.' });
        }

        // Quand le joueur arriver il attend de reçevoir ses cartes
        salon.players.push({
            id_compte: req.user.id,
            seat_index,
            hand: [],
            bet: 0,
            status: 'waiting',
            isTurn: false
        });
        salon.updated_at = new Date();
        await salon.save();

        return res.status(201).json({ message: 'Joueur ajouté au salon.', salon });
    } catch (error) {
        return res.status(500).json({ message: "Erreur lors de l'ajout du joueur." });
    }
});

module.exports = router;