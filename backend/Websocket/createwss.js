const { WebSocketServer } = require('ws');

const createWSS = (server) => {
    return new WebSocketServer({ server });
};

module.exports = { createWSS };