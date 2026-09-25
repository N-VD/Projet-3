const mongoose = require('mongoose');

const compteSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  date_naissance: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: 'player' },
  montant: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Compte', compteSchema);