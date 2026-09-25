const mongoose = require('mongoose');

// Main d'un joueur (plusieurs mains possibles après un split)
const mainSchema = new mongoose.Schema({
  cartes: { type: Array, default: [] },
  mise: { type: Number, required: true },
  statut: { type: String, default: 'en_cours' }, // en_cours, stand, bust, blackjack
  issueDuSplit: { type: Boolean, default: false },
  double: { type: Boolean, default: false },
  resultat: { type: String, default: null }, // gagne, perdu, egalite, blackjack
  gain: { type: Number, default: 0 }
}, { _id: false });

// Partie de blackjack solo d'un joueur contre le croupier
const partieBlackjackSchema = new mongoose.Schema({
  id_compte: { type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true },
  statut: { type: String, default: 'en_cours' }, // en_cours, terminee
  sabot: { type: Array, default: [] },
  croupier: { type: Array, default: [] },
  mains: [mainSchema],
  mainActive: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
}, { optimisticConcurrency: true });

// Une seule partie en cours par joueur
partieBlackjackSchema.index(
  { id_compte: 1 },
  { unique: true, partialFilterExpression: { statut: 'en_cours' } }
);

module.exports = mongoose.model('PartieBlackjack', partieBlackjackSchema);
