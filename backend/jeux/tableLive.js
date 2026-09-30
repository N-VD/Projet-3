const TableLive = require('../models/tableLive');
const live = require('./blackjackLive');
const { crediter } = require('../argent');

// Table live unique, gardée en mémoire et sauvegardée dans MongoDB.
// Toutes les modifications passent par une file pour qu'elles ne s'entremêlent jamais.

const INTERVALLE_TICK = 250;

let table = live.creerTable();
let file = Promise.resolve();

function enFile(operation) {
    const resultat = file.then(operation);
    file = resultat.catch((err) => console.error('Table live :', err));
    return resultat;
}

async function sauvegarder() {
    await TableLive.updateOne({ _id: 'principale' }, { etat: table, updated_at: new Date() }, { upsert: true });
}

async function verser(paiements) {
    for (const { id_compte, montant, desc } of paiements) {
        await crediter(id_compte, montant, desc);
    }
}

// La vision envoie son état plusieurs fois par seconde : on ne sauvegarde que si la partie a changé
function empreinte() {
    return JSON.stringify({ ...table, derniereVision: 0 });
}

// Exécute une modification de la table, la sauvegarde, puis verse les gains si la manche vient de se terminer
function modifier(operation) {
    return enFile(async () => {
        const avant = empreinte();
        const resultat = await operation(table, Date.now());
        const aPayer = live.paiementsDus(table);
        // Sauvegarde avant de payer : un redémarrage ne peut pas payer deux fois
        if (empreinte() !== avant) await sauvegarder();
        await verser(aPayer);
        return resultat;
    });
}

function lire(operation) {
    return enFile(() => operation(table, Date.now()));
}

async function demarrer() {
    await enFile(async () => {
        const sauvegarde = await TableLive.findById('principale').lean();
        if (sauvegarde) table = sauvegarde.etat;
    });

    setInterval(() => {
        modifier((etat, maintenant) => live.tick(etat, maintenant));
    }, INTERVALLE_TICK);
}

module.exports = { demarrer, modifier, lire };
