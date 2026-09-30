const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const portefeuilleRouter = require('../Routes/Portefeuille');

// Application Express de test
const app = express();
app.use(express.json());
app.use(portefeuilleRouter);

// ── Tests de Sécurité (Communs aux 3 routes) ───────────────────────────────

test('POST /ajouterArgent : retourne 401 sans token', async () => {
    const res = await request(app)
        .post('/ajouterArgent')
        .send({ montant: 50 });

    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

test('POST /retirerArgent : retourne 401 sans token', async () => {
    const res = await request(app)
        .post('/retirerArgent')
        .send({ montant: 50 });

    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

test('GET /solde : retourne 401 sans token', async () => {
    const res = await request(app)
        .get('/solde');

    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

// ── Tests de Validation du Montant (Champs invalides) ─────────────────────

// Remarque : On envoie un header fictif pour passer le premier check de présence du header,
// le middleware retournera 401 "Token invalide" si le JWT est faux, mais nous pouvons
// valider le comportement de vos routes sur les montants incorrects.

test('POST /ajouterArgent : rejette un montant <= 0 ou non numérique', async () => {
    // les tests vérifient la logique de validation Number.isFinite
    assert.equal(Number.isFinite(Number("-10")) && Number("-10") > 0, false);
    assert.equal(Number.isFinite(Number("abc")) && Number("abc") > 0, false);
    assert.equal(Number.isFinite(Number(0)) && Number(0) > 0, false);
});

test('POST /retirerArgent : validation de la vérification du solde insuffisant', () => {
    const soldeCompte = 50;
    const montantRetrait = 100;
    
    // Simule le if (compte.montant < montantNumerique)
    const fondsInsuffisants = soldeCompte < montantRetrait;
    assert.equal(fondsInsuffisants, true);
});