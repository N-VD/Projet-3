const { test } = require('node:test');
const assert = require('node:assert/strict');
const { attribuerMains, versCartes } = require('../jeux/mainsDetectees');

// Joueurs volontairement dans le désordre : le siège 2 est avant le siège 0 dans le tableau
function fauxSalon() {
    return {
        dealer_hand: [],
        players: [
            { id_compte: 'joueurSiege2', seat_index: 2, bet: 20, hands: [] },
            { id_compte: 'joueurSiege0', seat_index: 0, bet: 10, hands: [] },
        ],
    };
}

// Même forme que decrire_main dans detection.py (seuls les champs utiles ici)
function mainDetectee(id, cartes) {
    return { id, cartes, complete: true };
}

function joueur(salon, idCompte) {
    return salon.players.find((player) => player.id_compte === idCompte);
}

test('versCartes : rangs détectés vers cartes du salon', () => {
    assert.deepEqual(versCartes(['K', '7']), [{ rang: 'K' }, { rang: '7' }]);
    assert.deepEqual(versCartes(undefined), []);
});

test('croupier : ses cartes vont dans dealer_hand', () => {
    const salon = fauxSalon();
    attribuerMains(salon, { croupier: mainDetectee(0, ['A', '6']), joueurs: [] });
    assert.deepEqual(salon.dealer_hand, [{ rang: 'A' }, { rang: '6' }]);
});

test('croupier null : dealer_hand vide', () => {
    const salon = fauxSalon();
    salon.dealer_hand = [{ rang: 'K' }];
    attribuerMains(salon, { croupier: null, joueurs: [] });
    assert.deepEqual(salon.dealer_hand, []);
});

test('la première main détectée va au siège 0, même si players est dans le désordre', () => {
    const salon = fauxSalon();
    attribuerMains(salon, {
        croupier: null,
        joueurs: [mainDetectee(1, ['10', '9']), mainDetectee(2, ['5', '5'])],
    });
    assert.deepEqual(joueur(salon, 'joueurSiege0').hands, [{ cartes: [{ rang: '10' }, { rang: '9' }], mise: 10 }]);
    assert.deepEqual(joueur(salon, 'joueurSiege2').hands, [{ cartes: [{ rang: '5' }, { rang: '5' }], mise: 20 }]);
});

test("un joueur qui n'a pas misé ne reçoit pas de main et garde ses hands", () => {
    const salon = fauxSalon();
    salon.players.push({ id_compte: 'sansMise', seat_index: 1, bet: 0, hands: ['intact'] });
    attribuerMains(salon, {
        croupier: null,
        joueurs: [mainDetectee(1, ['10', '9']), mainDetectee(2, ['5', '5'])],
    });
    assert.deepEqual(joueur(salon, 'sansMise').hands, ['intact']);
    // Le siège 1 n'a pas misé : la 2e main va au siège 2
    assert.deepEqual(joueur(salon, 'joueurSiege2').hands[0].cartes, [{ rang: '5' }, { rang: '5' }]);
});

test('moins de mains que de joueurs : le joueur sans main reçoit cartes []', () => {
    const salon = fauxSalon();
    attribuerMains(salon, { croupier: null, joueurs: [mainDetectee(1, ['10', '9'])] });
    assert.deepEqual(joueur(salon, 'joueurSiege2').hands, [{ cartes: [], mise: 20 }]);
});

test('plus de mains que de joueurs : les mains en trop sont ignorées sans planter', () => {
    const salon = fauxSalon();
    attribuerMains(salon, {
        croupier: null,
        joueurs: [mainDetectee(1, ['2']), mainDetectee(2, ['3']), mainDetectee(3, ['4'])],
    });
    assert.deepEqual(joueur(salon, 'joueurSiege0').hands[0].cartes, [{ rang: '2' }]);
    assert.deepEqual(joueur(salon, 'joueurSiege2').hands[0].cartes, [{ rang: '3' }]);
});
