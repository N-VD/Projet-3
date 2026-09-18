const mongoose = require('mongoose');

// Schéma pour l'historique d'un joueur dans une main jouée
const playerHandSchema = new mongoose.Schema({
  id_compte: { type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true },
  hand: { type: Array, required: true },
  bet: { type: Number, required: true },
  outcome: { type: String, required: true }, // win, lose, push, blackjack
  payout: { type: Number, required: true }
}, { _id: false });

const handSchema = new mongoose.Schema({
  id_table: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Salon', 
    required: true 
  },
  dealer_hand: { type: Array, required: true },
  players: [playerHandSchema],
  played_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('hands', handSchema);