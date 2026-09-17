const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tempData', 'comptes.json');

function lire() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function ecrire(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const Compte = {
    findOne(criteres) {
        const comptes = lire();
        return comptes.find(c =>
            Object.entries(criteres).every(([k, v]) => c[k] === v)
        ) ?? null;
    },

    findAll() {
        return lire();
    },

    create(data) {
        const comptes = lire();
        const nouveau = { id: Date.now().toString(), ...data };
        comptes.push(nouveau);
        ecrire(comptes);
        return nouveau;
    },

    deleteById(id) {
        const comptes = lire();
        const filtres = comptes.filter(c => c.id !== id);
        ecrire(filtres);
    },

    updateById(id, champs) {
        const comptes = lire();
        const idx = comptes.findIndex(c => c.id === id);
        if (idx === -1) return null;
        comptes[idx] = { ...comptes[idx], ...champs };
        ecrire(comptes);
        return comptes[idx];
    }
};

module.exports = { Compte };
