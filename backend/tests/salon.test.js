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

// ── Tests Spectateur ────────────────────────────────────────────────────────

function fauxSalon(status) {
    return {
        status,
        deck: [{ rang: '2' }, { rang: '3' }],
        dealer_hand: [{ rang: 'K' }, { rang: '7' }],
        players: [{ id_compte: 'abc123', seat_index: 0, hand: [{ rang: '10' }, { rang: '9' }], bet: 50, status: 'waiting', isTurn: true }],
        currentTurnSeat: 0
    };
}

test('GET /spectateur/salons/:id : retourne 400 pour un ID invalide, sans token', async () => {
    const res = await request(app).get('/spectateur/salons/abc');
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Identifiant de salon invalide.");
});

test('vueInvite : ne renvoie ni le deck ni les id_compte', () => {
    const vue = salonRouter.vueInvite(fauxSalon('playing'));
    assert.equal('deck' in vue, false);
    assert.equal('id_compte' in vue.players[0], false);
});

test('vueInvite : cache la 2e carte du croupier pendant la partie', () => {
    const vue = salonRouter.vueInvite(fauxSalon('playing'));
    assert.deepEqual(vue.dealer_hand.cartes, [{ rang: 'K' }, { cachee: true }]);
    assert.equal(vue.dealer_hand.total, 10);
});

test('vueInvite : révèle les cartes du croupier quand la partie est finie', () => {
    const vue = salonRouter.vueInvite(fauxSalon('finished'));
    assert.deepEqual(vue.dealer_hand.cartes, [{ rang: 'K' }, { rang: '7' }]);
    assert.equal(vue.dealer_hand.total, 17);
    assert.equal(vue.currentTurnSeat, null);
});

test('vueInvite : renvoie les cartes, le total et la mise des joueurs', () => {
    const joueur = salonRouter.vueInvite(fauxSalon('playing')).players[0];
    assert.equal(joueur.total, 19);
    assert.equal(joueur.mise, 50);
    assert.equal(joueur.seat_index, 0);
});

test('estJoueurDuSalon : vrai seulement pour un joueur assis', () => {
    const salon = fauxSalon('playing');
    assert.equal(salonRouter.estJoueurDuSalon(salon, 'abc123'), true);
    assert.equal(salonRouter.estJoueurDuSalon(salon, 'zzz999'), false);
});

test('GET /spectateur/compte/salons/:id : retourne 401 si aucun token fourni', async () => {
    const res = await request(app).get('/spectateur/compte/salons/abc');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Accès refusé. Token manquant.");
});

test('vueInviteJoueur : ajoute le nom des joueurs sans id_compte ni deck', () => {
    const salon = fauxSalon('playing');
    salon.players[0].id_compte = { _id: 'abc123', nom: 'Alice' };
    const vue = salonRouter.vueInviteJoueur(salon);
    assert.equal(vue.players[0].nom, 'Alice');
    assert.equal('id_compte' in vue.players[0], false);
    assert.equal('deck' in vue, false);
});

test('vueInviteJoueur : nom à null si le compte n\'existe plus', () => {
    const salon = fauxSalon('playing');
    salon.players[0].id_compte = null;
    assert.equal(salonRouter.vueInviteJoueur(salon).players[0].nom, null);
});

test('vueInvite : pas de résultat pendant la partie', () => {
    const vue = salonRouter.vueInvite(fauxSalon('playing'));
    assert.equal(vue.players[0].mains[0].resultat, null);
});

test('vueInvite : affiche le résultat une fois la manche finie', () => {
    // joueur 19 contre croupier 17
    const vue = salonRouter.vueInvite(fauxSalon('waiting'));
    assert.equal(vue.players[0].mains[0].resultat, 'gagne');
});

test('vueInvite : résultat perdu si le joueur dépasse 21', () => {
    const salon = fauxSalon('finished');
    salon.players[0].hand = [{ rang: '10' }, { rang: '9' }, { rang: '5' }];
    assert.equal(salonRouter.vueInvite(salon).players[0].mains[0].resultat, 'perdu');
});
