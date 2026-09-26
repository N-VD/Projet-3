const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const comptesRouter = require('../Routes/Comptes');

// On recrée l'application Express comme dans votre app.js
const app = express();
app.use(express.json());
app.use(comptesRouter); // On monte le routeur exactement comme dans app.js

// ── Tests de la route POST /register ─────────────────────────────────────────

test('POST /register : retourne 400 si des champs sont manquants', async () => {
    const res = await request(app)
        .post('/register')
        .send({ nom: 'Jean' });

    assert.equal(res.status, 400);
});

test('POST /register : retourne 400 si l\'utilisateur est mineur', async () => {
    const res = await request(app)
        .post('/register')
        .send({
            nom: 'JeuneJoueur',
            password: 'Secret1234!',
            date_naissance: '2020-01-01',
            email: 'jeune@example.com'
        });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Vous devez avoir au moins 18 ans pour vous inscrire.");
});

// ── Tests de la route GET /me ────────────────────────────────────────────────

test('GET /me : retourne 401 si aucun token n\'est fourni', async () => {
    const res = await request(app)
        .get('/me'); // On appelle /me directement

    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

test('GET /me : retourne 401 si le token est invalide', async () => {
    const res = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer token_invalide');

    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Token invalide ou expiré");
});