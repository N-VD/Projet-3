const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validerChamps, validerMotDePasse, validerAge } = require('../fonctionsCommunes');

// ── Tests de validerChamps ──────────────────────────────────────────────────

test('validerChamps : retourne true si tous les champs sont remplis', () => {
    const champs = { nom: 'Dupont', prenom: 'Jean', age: 25 };
    assert.equal(validerChamps(champs), true);
});

test('validerChamps : retourne une erreur si un champ est vide, null ou undefined', () => {
    assert.deepEqual(validerChamps({ nom: '' }), { error: "Champ 'nom' obligatoire." });
    assert.deepEqual(validerChamps({ nom: 'Dupont', prenom: null }), { error: "Champ 'prenom' obligatoire." });
    assert.deepEqual(validerChamps({ nom: 'Dupont', age: undefined }), { error: "Champ 'age' obligatoire." });
});

// ── Tests de validerMotDePasse ──────────────────────────────────────────────

test('validerMotDePasse : valide pour 8+ caractères et au moins 1 caractère spécial', () => {
    assert.equal(validerMotDePasse('Secret123!'), null);
});

test('validerMotDePasse : erreur si moins de 8 caractères', () => {
    assert.equal(validerMotDePasse('Sec1!'), "Le mot de passe doit contenir au moins 8 caractères.");
});

test('validerMotDePasse : erreur si aucun caractère spécial', () => {
    assert.equal(validerMotDePasse('Secret1234'), "Le mot de passe doit contenir au moins un caractère spécial.");
});

test('validerMotDePasse : cas limites (types invalides)', () => {
    assert.equal(validerMotDePasse(123456789), "Le mot de passe doit contenir au moins 8 caractères.");
    assert.equal(validerMotDePasse(null), "Le mot de passe doit contenir au moins 8 caractères.");
});

// ── Tests de validerAge ─────────────────────────────────────────────────────

test('validerAge : retourne null si la personne a au moins 18 ans', () => {
    assert.equal(validerAge('2000-01-01'), null);
});

test('validerAge : retourne une erreur si la personne est mineure', () => {
    assert.equal(validerAge('2015-01-01'), "Vous devez avoir au moins 18 ans pour vous inscrire.");
});

test('validerAge : retourne une erreur pour une date invalide', () => {
    assert.equal(validerAge('date-invalide'), "La date de naissance est invalide.");
});