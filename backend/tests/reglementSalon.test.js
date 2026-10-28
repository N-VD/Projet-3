const { test } = require('node:test');
const assert = require('node:assert/strict');

const { retourJoueur } = require('../jeux/reglementSalon');

test('retourJoueur : retourne la mise et le gain pour une main gagnante', () => {
    const player = { bet: 10, hands: [{ cartes: [{ rang: 'K' }, { rang: 'Q' }], mise: 10 }] };
    const dealerHand = [{ rang: '9' }, { rang: '8' }];

    assert.equal(retourJoueur(player, dealerHand), 20);
});

test('retourJoueur : rend seulement la mise en cas d’égalité', () => {
    const player = { bet: 10, hands: [{ cartes: [{ rang: 'K' }, { rang: '8' }], mise: 10 }] };
    const dealerHand = [{ rang: '10' }, { rang: '8' }];

    assert.equal(retourJoueur(player, dealerHand), 10);
});

test('retourJoueur : ne retourne rien pour une main perdante', () => {
    const player = { bet: 10, hands: [{ cartes: [{ rang: '10' }, { rang: '6' }], mise: 10 }] };
    const dealerHand = [{ rang: '10' }, { rang: '9' }];

    assert.equal(retourJoueur(player, dealerHand), 0);
});

test('retourJoueur : paie un blackjack naturel à 3:2 avec la mise rendue', () => {
    const player = { bet: 10, hands: [{ cartes: [{ rang: 'A' }, { rang: 'K' }], mise: 10, naturel: true }] };
    const dealerHand = [{ rang: '9' }, { rang: '8' }];

    assert.equal(retourJoueur(player, dealerHand), 25);
});

test('retourJoueur : rend la mise si les deux côtés ont un blackjack naturel', () => {
    const player = { bet: 10, hands: [{ cartes: [{ rang: 'A' }, { rang: 'K' }], mise: 10, naturel: true }] };
    const dealerHand = [{ rang: 'A' }, { rang: 'Q' }];

    assert.equal(retourJoueur(player, dealerHand), 10);
});

test('retourJoueur : additionne les retours des mains séparées', () => {
    const player = {
        bet: 10,
        hands: [
            { cartes: [{ rang: 'K' }, { rang: 'Q' }], mise: 10 },
            { cartes: [{ rang: '9' }, { rang: '8' }], mise: 10 },
        ],
    };
    const dealerHand = [{ rang: '9' }, { rang: '8' }];

    assert.equal(retourJoueur(player, dealerHand), 30);
});
