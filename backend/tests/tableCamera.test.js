const { test } = require('node:test');
const assert = require('node:assert/strict');

const { lireMains, etatTable, siegeDeLaPosition } = require('../jeux/tableCamera');

const main = (cartes, position, nb_cartes_detectees = cartes.length) => ({ cartes, position, nb_cartes_detectees });

test('lireMains : refuse un message qui n’est pas une liste de mains valides', () => {
    assert.equal(lireMains(undefined), null);
    assert.equal(lireMains([main(['Z'], [0.5, 0.5])]), null);
    assert.equal(lireMains([main(['K'], [640, 480])]), null);
});

test('lireMains : convertit l’as lu comme "1"', () => {
    assert.deepEqual(lireMains([main(['1', 'K'], [0.5, 0.8])])[0].cartes, ['A', 'K']);
});

test('siegeDeLaPosition : le haut de l’image est le croupier, le bas est découpé en 6 sièges', () => {
    assert.equal(siegeDeLaPosition([0.5, 0.1]), null);
    assert.equal(siegeDeLaPosition([0.0, 0.8]), 0);
    assert.equal(siegeDeLaPosition([0.55, 0.8]), 3);
    assert.equal(siegeDeLaPosition([1.0, 0.8]), 5);
});

test('etatTable : attribue les mains au croupier et aux sièges avec leurs totaux', () => {
    const etat = etatTable(lireMains([
        main(['9', '7'], [0.9, 0.7]),
        main(['K'], [0.5, 0.2]),
        main(['A', 'K'], [0.1, 0.7]),
    ]));

    assert.equal(etat.croupier.length, 1);
    assert.equal(etat.croupier[0].total, 10);
    assert.deepEqual(etat.sieges.map((siege) => siege.seat_index), [0, 5]);
    assert.equal(etat.sieges[0].mains[0].blackjack, true);
    assert.deepEqual(etat.sieges[0].mains[0].actions, []);
    assert.equal(etat.sieges[1].mains[0].total, 16);
    assert.deepEqual(etat.sieges[1].mains[0].actions, ['hit', 'stand', 'double']);
});

test('etatTable : main soft, split possible et aucune action tant qu’une carte n’est pas lue', () => {
    const [paire, attente] = etatTable(lireMains([
        main(['8', '8'], [0.1, 0.7]),
        main(['5', '6'], [0.9, 0.7], 3),
    ])).sieges.map((siege) => siege.mains[0]);

    assert.deepEqual(paire.actions, ['hit', 'stand', 'double', 'split']);
    assert.equal(attente.complete, false);
    assert.deepEqual(attente.actions, []);

    const soft = etatTable(lireMains([main(['A', '6'], [0.1, 0.7])])).sieges[0].mains[0];
    assert.equal(soft.total, 17);
    assert.equal(soft.soft, true);
});

test('etatTable : une main qui dépasse 21 est bust', () => {
    const bust = etatTable(lireMains([main(['K', '9', '5'], [0.1, 0.7])])).sieges[0].mains[0];
    assert.equal(bust.bust, true);
    assert.deepEqual(bust.actions, []);
});
