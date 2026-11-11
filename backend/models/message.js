const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  salonId: { type: String, required: true, index: true },
  nom:     { type: String, required: true },
  role:    { type: String, default: 'player' },
  texte:   { type: String, required: true, maxlength: 200 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
