const { test } = require('node:test');
const assert = require('node:assert/strict');

const { initialiserChat } = require('../sockets/chat');
const Message = require('../models/message');
const { jwt, jwt_mdp } = require('../fonctionsCommunes');

// ── Faux socket / faux io (aucun réseau, aucune base de données) ────────────

function creerFauxSocket() {
    const handlers = {};
    const socket = {
        rooms: new Set(),
        emis: [],
        on: (evt, fn) => { handlers[evt] = fn; },
        emit: (evt, data) => socket.emis.push({ evt, data }),
        join: (room) => socket.rooms.add(room),
        leave: (room) => socket.rooms.delete(room),
        // Simule un événement reçu du client
        recevoir: (evt, data) => handlers[evt](data),
    };
    return socket;
}

function creerFauxIo() {
    const io = {
        diffuses: [],
        to: (room) => ({ emit: (evt, data) => io.diffuses.push({ room, evt, data }) }),
    };
    return io;
}

function preparer() {
    const io = creerFauxIo();
    const socket = creerFauxSocket();
    initialiserChat(io, socket);
    return { io, socket };
}

const tokenValide = (payload = { id: 'id-1', nom: 'Andy', role: 'player' }) =>
    jwt.sign(payload, jwt_mdp, { expiresIn: '1h' });

// Simule la chaîne Message.find().sort().limit().lean()
function mockFind(t, resultats) {
    return t.mock.method(Message, 'find', () => ({
        sort: () => ({ limit: () => ({ lean: async () => resultats }) }),
    }));
}

function mockCreate(t) {
    return t.mock.method(Message, 'create', async (donnees) => ({ _id: 'msg-1', ...donnees }));
}

// ── chat_rejoindre / chat_quitter ───────────────────────────────────────────

test('chat_rejoindre : rejoint la room chat:<salonId>', async (t) => {
    mockFind(t, []);
    const { socket } = preparer();

    await socket.recevoir('chat_rejoindre', 'salon-1');

    assert.ok(socket.rooms.has('chat:salon-1'));
});

test('chat_rejoindre : envoie l\'historique dans l\'ordre chronologique', async (t) => {
    // La BD renvoie du plus récent au plus ancien (sort -1)
    const find = mockFind(t, [{ texte: 'troisième' }, { texte: 'deuxième' }, { texte: 'premier' }]);
    const { socket } = preparer();

    await socket.recevoir('chat_rejoindre', 'salon-1');

    assert.deepEqual(find.mock.calls[0].arguments[0], { salonId: 'salon-1' });
    const historique = socket.emis.find((e) => e.evt === 'chat_historique');
    assert.deepEqual(historique.data.map((m) => m.texte), ['premier', 'deuxième', 'troisième']);
});

test('chat_quitter : quitte la room', async (t) => {
    mockFind(t, []);
    const { socket } = preparer();

    await socket.recevoir('chat_rejoindre', 'salon-1');
    socket.recevoir('chat_quitter', 'salon-1');

    assert.equal(socket.rooms.has('chat:salon-1'), false);
});

// ── chat_envoyer : sécurité ─────────────────────────────────────────────────

test('chat_envoyer : refuse un utilisateur sans token', async (t) => {
    const create = mockCreate(t);
    const { io, socket } = preparer();

    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: 'salut' });

    assert.equal(create.mock.callCount(), 0);
    assert.equal(io.diffuses.length, 0);
    assert.equal(socket.emis[0].evt, 'chat_erreur');
});

test('chat_envoyer : refuse un token signé avec un autre secret', async (t) => {
    const create = mockCreate(t);
    const { socket } = preparer();
    const fauxToken = jwt.sign({ nom: 'Pirate' }, 'mauvais-secret');

    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: 'salut', token: fauxToken });

    assert.equal(create.mock.callCount(), 0);
    assert.equal(socket.emis[0].evt, 'chat_erreur');
});

test('chat_envoyer : le nom vient du token, pas du client', async (t) => {
    const create = mockCreate(t);
    const { socket } = preparer();

    await socket.recevoir('chat_envoyer', {
        salonId: 'salon-1', texte: 'salut', token: tokenValide(), nom: 'Usurpateur',
    });

    assert.equal(create.mock.calls[0].arguments[0].nom, 'Andy');
});

// ── chat_envoyer : validation ───────────────────────────────────────────────

test('chat_envoyer : ignore un message vide ou seulement des espaces', async (t) => {
    const create = mockCreate(t);
    const { io, socket } = preparer();

    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: '    ', token: tokenValide() });

    assert.equal(create.mock.callCount(), 0);
    assert.equal(io.diffuses.length, 0);
});

test('chat_envoyer : coupe un message à 200 caractères', async (t) => {
    const create = mockCreate(t);
    const { socket } = preparer();

    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: 'a'.repeat(500), token: tokenValide() });

    assert.equal(create.mock.calls[0].arguments[0].texte.length, 200);
});

test('chat_envoyer : anti-spam, refuse un 2e message dans la même seconde', async (t) => {
    const create = mockCreate(t);
    const { socket } = preparer();
    const token = tokenValide();

    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: 'un', token });
    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: 'deux', token });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(socket.emis.at(-1).evt, 'chat_erreur');
});

test('chat_envoyer : accepte un 2e message après le délai', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 10_000 });
    const create = mockCreate(t);
    const { socket } = preparer();
    const token = tokenValide();

    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: 'un', token });
    t.mock.timers.tick(1001);
    await socket.recevoir('chat_envoyer', { salonId: 'salon-1', texte: 'deux', token });

    assert.equal(create.mock.callCount(), 2);
});

// ── chat_envoyer : diffusion ────────────────────────────────────────────────

test('chat_envoyer : sauvegarde et diffuse à toute la room du salon', async (t) => {
    mockCreate(t);
    const { io, socket } = preparer();

    await socket.recevoir('chat_envoyer', {
        salonId: 'salon-1', texte: '  bonne chance !  ', token: tokenValide({ nom: 'Croupier', role: 'dealer' }),
    });

    assert.equal(io.diffuses.length, 1);
    const { room, evt, data } = io.diffuses[0];
    assert.equal(room, 'chat:salon-1');
    assert.equal(evt, 'chat_message');
    assert.equal(data.texte, 'bonne chance !');
    assert.equal(data.nom, 'Croupier');
    assert.equal(data.role, 'dealer');
});
