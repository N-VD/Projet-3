const mongoose = require('mongoose');

const compteSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true },
  // Un compte créé via GitHub n'a pas de mot de passe
  password: { type: String, required: function () { return !this.githubId; } },
  githubId: { type: String, unique: true, sparse: true },
  date_naissance: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: 'player' },
  montant: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Compte || mongoose.model('Compte', compteSchema);
