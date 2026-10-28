const express = require('express');
const mongoose = require('mongoose');
const { authentifier } = require('../fonctionsCommunes');
const Salon = require('../models/salon');
const Compte = require('../models/compte');
const Transaction = require('../models/transaction');
const { retourJoueur } = require('../jeux/reglementSalon');
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
            created_by: req.user.id,
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
        const role = req.user?.role?.toLowerCase();
        const filtre = role === 'dealer' || role === 'admin'
            ? { status: { $in: ['waiting', 'playing', 'finished'] } }
            : { status: { $in: ['waiting', 'playing'] } };
        const salons = await Salon.find(filtre)
            .select('_id created_by status players.id_compte players.seat_index created_at')
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

        const joueurExistant = salon.players.find((player) => player.id_compte.toString() === req.user.id.toString());
        if (joueurExistant) {
            return res.status(200).json({ message: 'Joueur reconnecté au salon.', salon });
        }

        // Une table peut accueillir au maximum six joueurs
        if (salon.players.length >= 6) {
            return res.status(409).json({ message: 'Ce salon est complet.' });
        }

        // Un joueur ne peut pas rejoindre un partie au milieur d'une manche
        if (salon.status !== 'waiting') {
            return res.status(409).json({ message: 'Ce salon n’accepte pas de joueurs pour le moment.' });
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
        || (hasStatus && !['waiting', 'playing', 'finished'].includes(status))
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

        const mouvementsCompte = [];
        let salonMisAJour;
        try {
            const demarrePartie = salon.status === 'waiting'
                && (status === 'playing' || status === 'finished')
                && salon.players.some((player) => Number(player.bet) > 0);
            const terminePartie = status === 'finished'
                && (salon.status === 'playing' || demarrePartie);
            const mainCroupier = hasDealerHand ? dealer_hand : salon.dealer_hand;

            async function appliquerMouvement(idCompte, montant, desc, debit = false) {
                const filtre = { _id: idCompte };
                if (debit) filtre.montant = { $gte: montant };
                const compte = await Compte.findOneAndUpdate(
                    filtre,
                    { $inc: { montant: debit ? -montant : montant } },
                    { new: true }
                );
                if (!compte) {
                    const erreur = new Error(debit ? 'Solde insuffisant pour cette mise.' : 'Compte introuvable pour le règlement.');
                    erreur.code = debit ? 'INSUFFICIENT_FUNDS' : 'ACCOUNT_NOT_FOUND';
                    throw erreur;
                }

                const entree = { id_compte: idCompte, montant: debit ? -montant : montant, transactionId: null };
                mouvementsCompte.push(entree);
                const transaction = await Transaction.create({
                    id_compte: idCompte,
                    desc,
                    montant: entree.montant
                });
                entree.transactionId = transaction._id;
            }

            if (demarrePartie) {
                for (const player of salon.players) {
                    const mise = Math.round(Number(player.bet) * 100) / 100;
                    if (!Number.isFinite(mise) || mise <= 0) continue;
                    await appliquerMouvement(player.id_compte, mise, 'Mise blackjack en salon', true);
                }
            }

            if (salon.status === 'playing' && hasPlayers) {
                for (const player of nextPlayers) {
                    const ancienJoueur = salon.players.find((ancien) => ancien.seat_index === player.seat_index);
                    if (ancienJoueur?.id_compte?.toString() !== player.id_compte?.toString()) continue;
                    const anciennesMains = Array.isArray(ancienJoueur.hands) ? ancienJoueur.hands : [];
                    const nouvellesMains = Array.isArray(player.hands) ? player.hands : [];
                    if (nouvellesMains.length > anciennesMains.length) {
                        const miseAncienne = anciennesMains.reduce((total, main) => total + Number(main.mise || 0), 0);
                        const miseNouvelle = nouvellesMains.reduce((total, main) => total + Number(main.mise || 0), 0);
                        const coutSupplementaire = Math.round((miseNouvelle - miseAncienne) * 100) / 100;
                        if (coutSupplementaire > 0) {
                            await appliquerMouvement(player.id_compte, coutSupplementaire, 'Mise split blackjack en salon', true);
                        }
                    }
                }
            }

            if (terminePartie && hasPlayers) {
                for (const player of nextPlayers) {
                    const ancienJoueur = salon.players.find((ancien) => ancien.seat_index === player.seat_index);
                    if (ancienJoueur?.id_compte?.toString() !== player.id_compte?.toString()
                        || ancienJoueur.status === 'finished' || player.status !== 'finished') continue;

                    const retour = retourJoueur(player, mainCroupier);
                    if (retour > 0) {
                        await appliquerMouvement(ancienJoueur.id_compte, retour, 'Retour et gain blackjack en salon');
                    }
                }
            }
            const updateData = {
                updated_at: new Date()
            };

            if (hasDealerHand) updateData.dealer_hand = dealer_hand;
            if (hasStatus) updateData.status = status;
            if (hasPlayers) updateData.players = players;
            if (hasCurrentTurnSeat) updateData.currentTurnSeat = currentTurnSeat;

            // 2. On applique la mise à jour atomique en base de données
            const salonMisAJour = await Salon.findByIdAndUpdate(
                salon._id || salon.id,
                updateData,
                { new: true, runValidators: true }
            );

        } catch (error) {
            for (const entree of mouvementsCompte.reverse()) {
                await Compte.findByIdAndUpdate(entree.id_compte, { $inc: { montant: -entree.montant } });
                if (entree.transactionId) await Transaction.findByIdAndDelete(entree.transactionId);
            }
            if (error.code === 'INSUFFICIENT_FUNDS' || error.code === 'ACCOUNT_NOT_FOUND') {
                return res.status(400).json({ message: error.message });
            }
            throw error;
        }

        const compteActuel = await Compte.findById(req.user.id).select('montant');

        // Utilise salonMisAJour s'il existe, sinon retombe sur l'objet salon initial
        const salonFinal = salonMisAJour || salon;

        return res.status(200).json({
            message: 'État de la partie mis à jour.',
            solde: compteActuel?.montant ?? null,
            gameStatus: {
                status: salonFinal.status,
                dealer_hand: salonFinal.dealer_hand,
                players: salonFinal.players,
                currentTurnSeat: salonFinal.currentTurnSeat
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

        const estAdmin = role === 'admin';
        const estCreateur = salon.created_by?.toString() === req.user.id.toString();
        if (!estAdmin && !estCreateur) {
            return res.status(403).json({ message: 'Vous ne pouvez fermer que les salons que vous avez créés.' });
        }

        // Vérifie le salon est en status finished pour le supprimer
        if (salon.status === 'playing') {
            return res.status(409).json({ message: 'Le salon ne peut pas être fermé pendant une partie.' });
        }

        await Salon.findByIdAndDelete(salonId);

        return res.status(200).json({ message: 'Salon supprimé.', salon });
    } catch (error) {
        console.error('ERREUR ROUTE DELETESALON :', error);
        return res.status(500).json({ message: 'Erreur lors de la suppression du salon.' });
    }
});

module.exports = router;