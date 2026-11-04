const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { Server } = require('socket.io');
const { io: client } = require('socket.io-client');

const { brancherAgentCamera, demarrerCamera, arreterCamera } = require('../sockets/agentCamera');

const CLE = 'cle_de_test';
const SALON_A = '64b7f0c2a1b2c3d4e5f60718';
const SALON_B = '64b7f0c2a1b2c3d4e5f60719';
const SALON_C = '64b7f0c2a1b2c3d4e5f6071a';
let server;
let url;
const sockets = [];

before(async () => {
    server = http.createServer();
    brancherAgentCamera(new Server(server), CLE);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}/agentCamera`;
});

after(async () => {
    for (const socket of sockets) socket.disconnect();
    await new Promise((resolve) => server.close(resolve));
});

function connecter(poste, cle = CLE) {
    const socket = client(url, { transports: ['websocket'], forceNew: true, auth: { cle, poste } });
    sockets.push(socket);
    return socket;
}

const attendre = (socket, evenement) => new Promise((resolve) => socket.once(evenement, resolve));

test("l'agent caméra est refusé sans la bonne clé", async () => {
    const erreur = await attendre(connecter('PC:0', 'mauvaise'), 'connect_error');
    assert.equal(erreur.message, 'Clé caméra invalide.');
});

test('chaque salon reçoit sa propre webcam, et un salon en attente prend la webcam libérée', async () => {
    const webcam0 = connecter('PC:0');
    const webcam1 = connecter('PC:1');
    await Promise.all([attendre(webcam0, 'connect'), attendre(webcam1, 'connect')]);

    const demarrages = Promise.all([webcam0, webcam1].map(async (webcam) => {
        webcam.salonRecu = (await attendre(webcam, 'demarrer')).salonId;
    }));
    await demarrerCamera(SALON_A);
    await demarrerCamera(SALON_B);
    await demarrages;
    assert.deepEqual([webcam0.salonRecu, webcam1.salonRecu].sort(), [SALON_A, SALON_B]);

    // plus de salons que de webcams : le troisième attend
    await demarrerCamera(SALON_C);

    // la webcam qui filmait A est libérée et reprend aussitôt C
    const filmeA = webcam0.salonRecu === SALON_A ? webcam0 : webcam1;
    const arret = attendre(filmeA, 'arreter');
    const reprise = attendre(filmeA, 'demarrer');
    await arreterCamera(SALON_A);
    assert.deepEqual(await arret, { salonId: SALON_A });
    assert.deepEqual(await reprise, { salonId: SALON_C });

    await arreterCamera(SALON_B);
    await arreterCamera(SALON_C);
});

test('la même webcam lancée deux fois remplace l’ancienne connexion', async () => {
    const ancienne = connecter('PC:5');
    await attendre(ancienne, 'connect');
    const deconnexion = attendre(ancienne, 'disconnect');
    const nouvelle = connecter('PC:5');
    await attendre(nouvelle, 'connect');
    assert.equal(await deconnexion, 'io server disconnect');
});
