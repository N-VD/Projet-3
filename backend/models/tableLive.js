const mongoose = require('mongoose');

// État complet de la table live, sauvegardé après chaque changement pour survivre à un redémarrage du serveur
const tableLiveSchema = new mongoose.Schema({
  _id: { type: String, default: 'principale' },
  etat: { type: mongoose.Schema.Types.Mixed, required: true },
  updated_at: { type: Date, default: Date.now }
}, { minimize: false });

module.exports = mongoose.model('TableLive', tableLiveSchema);
