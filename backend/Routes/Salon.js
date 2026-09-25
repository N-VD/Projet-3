const express = require('express');
const mongoose = require('mongoose');
const { authentifier } = require('../fonctionsCommunes');
const Salon = require('../models/salon');
const Compte = require('../models/compte');
const Transaction = require('../models/transaction');
const router = express.Router();

function valeurMain(cartes = []) {
    let total = 0;
    let as = 0;
    for (const carte of cartes) {
        total += carte.rang === 'A' ? 11 : ['J', 'Q', 'K'].includes(carte.rang) ? 10 : Number(carte.rang);
        if (carte.rang === 'A') as++;
    }
    while (total > 21 && as > 0) {
        total -= 10;
        as--;
    }
    return total;
}

function ajustementJoueur(player, dealerHand) {
    const totalCroupier = valeurMain(dealerHand);
    const blackjackCroupier = dealerHand?.length === 2 && totalCroupier === 21;
    const mains = Array.isArray(player.hands) && player.hands.length > 0
        ? player.hands
        : [{ cartes: player.hand, mise: player.bet, naturel: player.status === 'blackjack' }];

    return mains.reduce((totalAjustement, main) => {
        const cartes = main.cartes || [];
        const totalJoueur = valeurMain(cartes);
        const mise = Math.round(Number(main.mise ?? player.bet) * 100) / 100;
        const blackjackJoueur = Boolean(main.naturel) && cartes.length === 2 && totalJoueur === 21;
        let ajustement = 0;

        if (!Number.isFinite(mise) || mise <= 0) return totalAjustement;
        if (totalJoueur > 21 || blackjackCroupier && !blackjackJoueur) ajustement = -mise;
        else if (blackjackJoueur && blackjackCroupier) ajustement = 0;
        else if (blackjackJoueur) ajustement = Math.round(mise * 150) / 100;
        else if (totalCroupier > 21 || totalJoueur > totalCroupier) ajustement = mise;
        else if (totalJoueur < totalCroupier) ajustement = -mise;

        return Math.round((totalAjustement + ajustement) * 100) / 100;
    }, 0);
}

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

        return res.status(201).json({ message: 'Salon créé', salon })
    } catch (error) {
        return res.status(500).json({ message: 'Erreur lors de la création du salon' });
    }
});

router.get('/salons', authentifier, async (req, res) => {
    try {
        const salons = await Salon.find({ status: { $in: ['waiting', 'playing'] } })
            .select('_id status players.id_compte players.seat_index created_at')
            .sort({ created_at: 1 })
            .lean();
        return res.status(200).json({ salons });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur lors du chargement des salons.' });
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

// Route pour update la partie en cours
router.patch('/gameStatus', authentifier, async (req, res) => {
    const { salonId, status, dealer_hand, players, currentTurnSeat } = req.body;
    const role = req.user?.role?.toLowerCase();

    // C'est le dealer qui lance le update ce fera probablement avec des signe de main
    //if (role !== 'dealer' && role !== 'admin') {
    //    return res.status(403).json({ message: "Accès refusé. Seul un dealer peut mettre à jour la partie." });
    //}
 
    const hasStatus = status !== undefined;
    const hasDealerHand = dealer_hand !== undefined;
    const hasPlayers = players !== undefined;
    const hasCurrentTurnSeat = currentTurnSeat !== undefined;

    // Juste une de des variables plus haut a besoin d'être changer
    if (!salonId || (!hasStatus && !hasDealerHand && !hasPlayers && !hasCurrentTurnSeat)
        || (hasStatus && !['waiting', 'playing','finished'].includes(status))
        || (hasDealerHand && !Array.isArray(dealer_hand))
        || (hasPlayers && !Array.isArray(players))
        || (hasCurrentTurnSeat && (!Number.isInteger(currentTurnSeat) || currentTurnSeat < 0))) {
        return res.status(400).json({
            message: 'salonId et au moins un champ de partie valide sont obligatoires.'
        });
    }

    try {
        const salon = await Salon.findById(salonId);

        if (!salon) {
            return res.status(404).json({ message: 'Salon non trouvé.' });
        }

        // Vérifie que les joueurs a la variable isTurn = true si le currentTurnSeat est le seat du joueurs 
        const nextPlayers = hasPlayers ? players : salon.players;
        const nextCurrentTurnSeat = hasCurrentTurnSeat
            ? currentTurnSeat
            : salon.currentTurnSeat;
        const hasValidTurnState = nextPlayers.every((player) => (
            player.isTurn === (player.seat_index === nextCurrentTurnSeat)
        ));

        if (!hasValidTurnState) {
            return res.status(400).json({
                message: 'isTurn doit être vrai uniquement pour le joueur dont seat_index correspond à currentTurnSeat.'
            });
        }

        const ajustements = [];
        try {
            if (hasPlayers) {
                const mainCroupier = hasDealerHand ? dealer_hand : salon.dealer_hand;
                for (const player of nextPlayers) {
                    const ancienJoueur = salon.players.find((ancien) => ancien.seat_index === player.seat_index);
                    const memeCompte = ancienJoueur?.id_compte?.toString() === player.id_compte?.toString();
                    if (!memeCompte || ancienJoueur.status === 'finished' || player.status !== 'finished') continue;

                    const ajustement = ajustementJoueur(player, mainCroupier);
                    if (ajustement === 0) continue;

                    const filtreCompte = { _id: ancienJoueur.id_compte };
                    if (ajustement < 0) filtreCompte.montant = { $gte: -ajustement };
                    const compte = await Compte.findOneAndUpdate(
                        filtreCompte,
                        { $inc: { montant: ajustement } },
                        { new: true }
                    );
                    if (!compte) {
                        const erreur = new Error('Solde insuffisant pour enregistrer la perte.');
                        erreur.code = 'INSUFFICIENT_FUNDS';
                        throw erreur;
                    }

                    const entree = { id_compte: ancienJoueur.id_compte, montant: ajustement, transactionId: null };
                    ajustements.push(entree);
                    const transaction = await Transaction.create({
                        id_compte: ancienJoueur.id_compte,
                        desc: ajustement < 0 ? 'Perte blackjack en salon' : 'Gain blackjack en salon',
                        montant: ajustement
                    });
                    entree.transactionId = transaction._id;
                }
            }

            if (hasDealerHand) salon.dealer_hand = dealer_hand;
            if (hasStatus) salon.status = status;
            if (hasPlayers) salon.players = players;
            if (hasCurrentTurnSeat) salon.currentTurnSeat = currentTurnSeat;
            salon.updated_at = new Date();
            await salon.save();
        } catch (error) {
            for (const entree of ajustements.reverse()) {
                await Compte.findByIdAndUpdate(entree.id_compte, { $inc: { montant: -entree.montant } });
                if (entree.transactionId) await Transaction.findByIdAndDelete(entree.transactionId);
            }
            if (error.code === 'INSUFFICIENT_FUNDS') {
                return res.status(400).json({ message: error.message });
            }
            throw error;
        }

        const compteActuel = await Compte.findById(req.user.id).select('montant');

        return res.status(200).json({
            message: 'État de la partie mis à jour.',
            solde: compteActuel?.montant ?? null,
            gameStatus: {
                status: salon.status,
                dealer_hand: salon.dealer_hand,
                players: salon.players,
                currentTurnSeat: salon.currentTurnSeat
            }
        });
    } catch (error) {
        console.error("ERREUR ROUTE GAMESTATUS :", error);
        return res.status(500).json({ message: "Erreur lors de la mise à jour de la partie." });
    }

});

router.delete('/deleteSalon', authentifier, async (req, res) => {
    const { salonId } = req.body;
    const role = req.user?.role?.toLowerCase();

    // Seul un dealer a le droit de fermé un salon
    if (role !== 'dealer' && role !== 'admin') {
        return res.status(403).json({ message: "Accès refusé. Seul un dealer peut supprimer un salon." });
    }

    if (!salonId || !mongoose.Types.ObjectId.isValid(salonId)) {
        return res.status(400).json({ message: 'salonId est obligatoire et doit être valide.' });
    }

    try {
        const salon = await Salon.findById(salonId);

        if (!salon) {
            return res.status(404).json({ message: 'Salon non trouvé.' });
        }

        // Vérifie le salon est en status finished pour le supprimer
        if (salon.status !== 'finished') {
            return res.status(409).json({ message: 'Le salon doit être terminé avant de pouvoir être supprimé.' });
        }

        await Salon.findByIdAndDelete(salonId);

        return res.status(200).json({ message: 'Salon supprimé.', salon });
    } catch (error) {
        console.error('ERREUR ROUTE DELETESALON :', error);
        return res.status(500).json({ message: 'Erreur lors de la suppression du salon.' });
    }
});

module.exports = router;