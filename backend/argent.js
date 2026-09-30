const Compte = require('./models/compte');
const Transaction = require('./models/transaction');

// Retire le montant seulement si le solde est suffisant (opération atomique : le solde ne peut devenir négatif)
async function debiter(idCompte, montant, desc) {
    const compte = await Compte.findOneAndUpdate(
        { _id: idCompte, montant: { $gte: montant } },
        { $inc: { montant: -montant } },
        { returnDocument: 'after' }
    );
    if (compte) {
        await Transaction.create({ id_compte: idCompte, desc, montant: -montant });
    }
    return compte;
}

async function crediter(idCompte, montant, desc) {
    const compte = await Compte.findByIdAndUpdate(idCompte, { $inc: { montant } }, { returnDocument: 'after' });
    await Transaction.create({ id_compte: idCompte, desc, montant });
    return compte;
}

module.exports = { debiter, crediter };
