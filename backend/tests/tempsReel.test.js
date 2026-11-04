const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { Server } = require('socket.io');
const { io: client } = require('socket.io-client');

const { brancherTempsReel } = require('../sockets/tempsReel');

const CLE = 'cle_de_test';
const SALON = '64b7f0c2a1b2c3d4e5f60718';
let server;
let url;
const sockets = [];

before(async () => {
    server = http.createServer();
    brancherTempsReel(new Server(server), CLE);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}`;
});

after(async () => {
    for (const socket of sockets) socket.disconnect();
    await new Promise((resolve) => server.close(resolve));
});

function connecter(chemin, options = {}) {
    const socket = client(url + chemin, { transports: ['websocket'], forceNew: true, ...options });
    sockets.push(socket);
    return socket;
}

const attendre = (socket, evenement, condition = () => true) => new Promise((resolve) => {
    const ecouteur = (donnees) => {
        if (!condition(donnees)) return;
        socket.off(evenement, ecouteur);
        resolve(donnees);
    };
    socket.on(evenement, ecouteur);
});

test('la caméra est refusée sans la bonne clé', async () => {
    const camera = connecter('/camera', { auth: { cle: 'mauvaise', salon: SALON } });
    const erreur = await attendre(camera, 'connect_error');
    assert.equal(erreur.message, 'Clé caméra invalide.');
});

test('les images et les mains de la caméra sont relayées aux clients du salon', async () => {
    const spectateur = connecter('');
    const etatInitial = attendre(spectateur, 'tableCamera');
    spectateur.emit('rejoindre', SALON);
    assert.equal((await etatInitial).camera, false);

    const cameraConnectee = attendre(spectateur, 'tableCamera', (etat) => etat.camera);
    const camera = connecter('/camera', { auth: { cle: CLE, salon: SALON } });
    await cameraConnectee;

    const image = attendre(spectateur, 'frame');
    camera.emit('frame', Buffer.from([0xff, 0xd8, 0xff]));
    assert.deepEqual([...new Uint8Array(await image)], [0xff, 0xd8, 0xff]);

    const mains = attendre(spectateur, 'tableCamera', (etat) => etat.table.sieges.length > 0);
    camera.emit('cartes', { timestamp: 1, mains: [{ cartes: ['K', '7'], nb_cartes_detectees: 2, position: [0.2, 0.8] }] });
    const etat = await mains;
    assert.equal(etat.table.sieges[0].seat_index, 1);
    assert.equal(etat.table.sieges[0].mains[0].total, 17);

    // un client qui arrive en retard reçoit tout de suite le dernier état
    const retardataire = connecter('');
    const etatRetard = attendre(retardataire, 'tableCamera');
    retardataire.emit('rejoindre', SALON);
    assert.equal((await etatRetard).table.sieges[0].mains[0].total, 17);

    const deconnexion = attendre(spectateur, 'tableCamera', (e) => !e.camera);
    camera.disconnect();
    await deconnexion;
});
