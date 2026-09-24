const mongoose = require('mongoose');

// Schéma du joueur présent à une table de jeu
const playerInSalonSchema = new mongoose.Schema({
  id_compte: { type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true },
  seat_index: { type: Number, required: true },
  hand: { type: Array, default: [] },
  bet: { type: Number, default: 0 },
  status: { type: String, default: 'waiting' }, // waiting, finished
  isTurn: { type: Boolean, default: false }
}, { _id: false });

const salonSchema = new mongoose.Schema({
  status: { type: String, default: 'waiting' }, // waiting, playing, finished
  dealer_hand: { type: Array, default: [] },
  deck: { type: Array, default: [] },
  players: [playerInSalonSchema], // Tableau de joueurs à la table
  currentTurnSeat: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Salon', salonSchema);