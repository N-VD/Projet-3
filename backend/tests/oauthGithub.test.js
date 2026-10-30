const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const oauthGithubRouter = require('../Routes/OAuthGithub');
const Compte = require('../models/compte');
const { jwt, jwt_mdp } = require('../fonctionsCommunes');

const app = express();
app.use(express.json());
app.use(oauthGithubRouter);

// Simule les réponses de GitHub : échange du code, profil puis courriels
function simulerGithub(t, { accessToken = 'gho_test', profil, courriels = [] }) {
    t.mock.method(globalThis, 'fetch', async (url) => {
        let corps;
        if (url.startsWith('https://github.com/login/oauth/access_token')) corps = accessToken ? { access_token: accessToken } : { error: 'bad_verification_code' };
        else if (url === 'https://api.github.com/user') corps = profil;
        else if (url === 'https://api.github.com/user/emails') corps = courriels;
        return { ok: true, json: async () => corps };
    });
}

function tokenInscriptionValide() {
    return jwt.sign({ githubId: '42', email: 'octo@example.com' }, `${jwt_mdp}-inscription-github`, { expiresIn: '15m' });
}

// ── GET /auth/github ─────────────────────────────────────────────────────────

test('GET /auth/github : redirige vers GitHub avec le state', async () => {
    process.env.GITHUB_CLIENT_ID = 'client-test';
    const state = 'abcdefghijklmnop1234';

    const res = await request(app).get(`/auth/github?state=${state}`);

    assert.equal(res.status, 302);
    const url = new URL(res.headers.location);
    assert.equal(url.origin + url.pathname, 'https://github.com/login/oauth/authorize');
    assert.equal(url.searchParams.get('client_id'), 'client-test');
    assert.equal(url.searchParams.get('state'), state);
});

test('GET /auth/github : retourne 400 si le state est absent', async () => {
    process.env.GITHUB_CLIENT_ID = 'client-test';
    const res = await request(app).get('/auth/github');
    assert.equal(res.status, 400);
});

// ── POST /auth/github ────────────────────────────────────────────────────────

test('POST /auth/github : retourne 400 si le code est manquant', async () => {
    const res = await request(app).post('/auth/github').send({});
    assert.equal(res.status, 400);
});

test('POST /auth/github : retourne 401 si GitHub refuse le code', async (t) => {
    simulerGithub(t, { accessToken: null });
    const res = await request(app).post('/auth/github').send({ code: 'mauvais' });
    assert.equal(res.status, 401);
});

test('POST /auth/github : connecte directement un githubId déjà connu', async (t) => {
    simulerGithub(t, { profil: { id: 42, login: 'octocat' } });
    t.mock.method(Compte, 'findOne', async () => ({ _id: 'id-compte', nom: 'octocat', role: 'player' }));

    const res = await request(app).post('/auth/github').send({ code: 'ok' });

    assert.equal(res.status, 200);
    assert.equal(jwt.verify(res.body.token, jwt_mdp).nom, 'octocat');
});

test('POST /auth/github : demande l\'âge à la première connexion d\'un githubId', async (t) => {
    simulerGithub(t, {
        profil: { id: 42, login: 'octocat' },
        courriels: [{ email: 'octo@example.com', primary: true, verified: true }]
    });
    t.mock.method(Compte, 'findOne', async () => null);
    t.mock.method(Compte, 'exists', async () => null);

    const res = await request(app).post('/auth/github').send({ code: 'ok' });

    assert.equal(res.status, 200);
    assert.equal(res.body.inscriptionRequise, true);
    assert.equal(res.body.nomSuggere, 'octocat');
    assert.equal(res.body.token, undefined);
    // Le token d'inscription ne doit pas être accepté comme token de session
    assert.throws(() => jwt.verify(res.body.tokenInscription, jwt_mdp));
});

test('POST /auth/github : retourne 409 si le courriel GitHub appartient déjà à un compte', async (t) => {
    simulerGithub(t, {
        profil: { id: 42, login: 'octocat' },
        courriels: [{ email: 'octo@example.com', primary: true, verified: true }]
    });
    t.mock.method(Compte, 'findOne', async () => null);
    t.mock.method(Compte, 'exists', async () => ({ _id: 'autre' }));

    const res = await request(app).post('/auth/github').send({ code: 'ok' });
    assert.equal(res.status, 409);
});

// ── POST /auth/github/inscription ────────────────────────────────────────────

test('POST /auth/github/inscription : retourne 400 si l\'utilisateur est mineur', async () => {
    const res = await request(app).post('/auth/github/inscription').send({
        tokenInscription: tokenInscriptionValide(),
        nom: 'octocat',
        date_naissance: '2020-01-01'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Vous devez avoir au moins 18 ans pour vous inscrire.");
});

test('POST /auth/github/inscription : retourne 401 si le token d\'inscription est invalide', async () => {
    const res = await request(app).post('/auth/github/inscription').send({
        tokenInscription: 'faux',
        nom: 'octocat',
        date_naissance: '1990-01-01'
    });
    assert.equal(res.status, 401);
});

test('POST /auth/github/inscription : crée le compte GitHub d\'un adulte', async (t) => {
    t.mock.method(Compte, 'exists', async () => null);
    const create = t.mock.method(Compte, 'create', async (donnees) => ({ _id: 'nouveau', ...donnees }));

    const res = await request(app).post('/auth/github/inscription').send({
        tokenInscription: tokenInscriptionValide(),
        nom: ' octocat ',
        date_naissance: '1990-01-01'
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    const donnees = create.mock.calls[0].arguments[0];
    assert.equal(donnees.githubId, '42');
    assert.equal(donnees.email, 'octo@example.com');
    assert.equal(donnees.nom, 'octocat');
    assert.equal(donnees.password, undefined);
});
