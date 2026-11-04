const { test } = require('node:test');
const assert = require('node:assert/strict');
const { roleDansSalon, vuePourRole } = require('../jeux/vueTable');
const { authentifierOptionnel, lireToken, genererToken } = require('../fonctionsCommunes');

function fauxSalon() {
    return {
        _id: 'salon1',
        created_by: 'dealer1',
        status: 'playing',
        dealer_hand: [{ rang: 'K' }],
        players: [{ id_compte: 'joueur1', seat_index: 0, hands: [{ cartes: [{ rang: '10' }, { rang: '9' }], mise: 50 }], bet: 50 }],
    };
}

// ── Rôle ────────────────────────────────────────────────────────────────────

test('roleDansSalon : un invité (pas de token) est spectateur', () => {
    assert.equal(roleDansSalon(fauxSalon(), null), 'spectateur');
});

test('roleDansSalon : le créateur du salon est dealer', () => {
    assert.equal(roleDansSalon(fauxSalon(), { id: 'dealer1', role: 'dealer' }), 'dealer');
});

test('roleDansSalon : un autre compte dealer est spectateur à cette table', () => {
    assert.equal(roleDansSalon(fauxSalon(), { id: 'dealer2', role: 'dealer' }), 'spectateur');
});

test('roleDansSalon : un compte assis est joueur', () => {
    assert.equal(roleDansSalon(fauxSalon(), { id: 'joueur1', role: 'player' }), 'joueur');
});

test('roleDansSalon : un compte connecté mais pas assis est spectateur', () => {
    assert.equal(roleDansSalon(fauxSalon(), { id: 'autre', role: 'player' }), 'spectateur');
});

// ── Vue selon le rôle ───────────────────────────────────────────────────────

test('vuePourRole : joueur et dealer reçoivent le salon tel quel', () => {
    const salon = fauxSalon();
    assert.equal(vuePourRole(salon, 'joueur'), salon);
    assert.equal(vuePourRole(salon, 'dealer'), salon);
});

test('vuePourRole : un spectateur ne reçoit pas les id de comptes', () => {
    const vue = vuePourRole(fauxSalon(), 'spectateur');
    assert.equal('created_by' in vue, false);
    assert.equal('id_compte' in vue.players[0], false);
});

test('vuePourRole : un spectateur voit les mêmes mains et le même croupier', () => {
    const vue = vuePourRole(fauxSalon(), 'spectateur');
    assert.deepEqual(vue.players[0].hands, fauxSalon().players[0].hands);
    assert.deepEqual(vue.dealer_hand, fauxSalon().dealer_hand);
    assert.equal(vue.players[0].seat_index, 0);
});

test('vuePourRole : ne modifie pas le salon reçu', () => {
    const salon = fauxSalon();
    vuePourRole(salon, 'spectateur');
    assert.deepEqual(salon, fauxSalon());
});

// ── Authentification facultative ────────────────────────────────────────────

test('lireToken : null sans token ou avec un token invalide', () => {
    assert.equal(lireToken(undefined), null);
    assert.equal(lireToken('pas-un-token'), null);
});

test('lireToken : retourne le compte d\'un token valide', () => {
    const token = genererToken({ _id: 'abc', nom: 'Alice', role: 'player' });
    assert.equal(lireToken(token).id, 'abc');
});

test('authentifierOptionnel : laisse passer un invité avec req.user = null', () => {
    const req = { headers: {} };
    let suivant = false;
    authentifierOptionnel(req, {}, () => { suivant = true; });
    assert.equal(suivant, true);
    assert.equal(req.user, null);
});

test('authentifierOptionnel : refuse un token invalide (401)', () => {
    const req = { headers: { authorization: 'Bearer pas-un-token' } };
    const res = { status(code) { this.code = code; return this; }, json() { return this; } };
    authentifierOptionnel(req, res, () => assert.fail('ne doit pas continuer'));
    assert.equal(res.code, 401);
});
