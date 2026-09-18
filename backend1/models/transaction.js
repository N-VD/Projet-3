const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  id_compte: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Compte', 
    required: true 
  },
  desc: { type: String, required: true },
  montant: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);