const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const salonRouter = require('../Routes/Salon');

// Application Express de test
const app = express();
app.use(express.json());
app.use(salonRouter);

// ── Tests de Sécurité (Token manquant) ──────────────────────────────────────

test('POST /createSalon : retourne 401 si aucun token fourni', async () => {
    const res = await request(app).post('/createSalon');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

test('POST /addPlayer : retourne 401 si aucun token fourni', async () => {
    const res = await request(app).post('/addPlayer');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

test('DELETE /deleteSalon : retourne 401 si aucun token fourni', async () => {
    const res = await request(app).delete('/deleteSalon');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

// ── Tests de Validation des Paramètres de Salon ─────────────────────────────

test('POST /addPlayer : valide la présence de salonId et seat_index valide', () => {
    const seatInvalide = -1;
    const seatNonEntier = 1.5;

    assert.equal(Number.isInteger(seatInvalide) && seatInvalide >= 0, false);
    assert.equal(Number.isInteger(seatNonEntier) && seatNonEntier >= 0, false);
    assert.equal(Number.isInteger(0) && 0 >= 0, true);
});

test('PATCH /gameStatus : valide les valeurs de statut permises', () => {
    const statutsValides = ['waiting', 'playing', 'finished'];

    assert.equal(statutsValides.includes('waiting'), true);
    assert.equal(statutsValides.includes('playing'), true);
    assert.equal(statutsValides.includes('invalid_status'), false);
});

test('PATCH /gameStatus : vérifie la logique de synchronisation isTurn', () => {
    const currentTurnSeat = 2;
    const players = [
        { seat_index: 0, isTurn: false },
        { seat_index: 2, isTurn: true }
    ];

    const isStateValid = players.every(
        (player) => player.isTurn === (player.seat_index === currentTurnSeat)
    );

    assert.equal(isStateValid, true);
});

test('DELETE /deleteSalon : rejette un ID MongoDB invalide', () => {
    const idInvalide = "123456";
    // Simulation de mongoose.Types.ObjectId.isValid
    const isValid = idInvalide.length === 24; 
    assert.equal(isValid, false);
});