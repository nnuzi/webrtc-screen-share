const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const os = require('os');

const certPath = '/etc/ssl/certs/server.crt';
const keyPath = '/etc/ssl/private/server.key';
const hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);
const PORT = hasCert ? 443 : 3000;

function getLanIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
}

app.get('/favicon.ico', (req, res) => res.redirect('/favicon.svg'));

app.get('/api/server-info', (req, res) => {
    const protocol = hasCert ? 'https' : 'http';
    if (process.env.PUBLIC_URL) {
        const url = new URL(process.env.PUBLIC_URL);
        res.json({ ip: url.hostname, port: url.port || (protocol === 'https' ? '443' : '3000'), protocol });
        return;
    }
    res.json({ ip: getLanIp(), port: PORT, protocol });
});

app.use(express.static('public'));

function createServer(port) {
    let server;
    if (hasCert) {
        const https = require('https');
        server = https.createServer({
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        }, app);
    } else {
        server = http.createServer(app);
    }

    const io = require('socket.io')(server);

    io.on('connection', (socket) => {
        const room = socket.handshake.query.room || 'default';
        socket.join(room);

        socket.on('offer', (offer) => { socket.to(room).emit('offer', offer); });
        socket.on('answer', (answer) => { socket.to(room).emit('answer', answer); });
        socket.on('candidate', (candidate) => { socket.to(room).emit('candidate', candidate); });
        socket.on('ready', () => { socket.to(room).emit('receiver-ready'); });
        socket.on('disconnect', () => {});
    });

    server.listen(port !== undefined ? port : PORT, '0.0.0.0');
    return { app, io, server };
}

if (require.main === module) {
    const { server } = createServer(PORT);
    console.log(`${hasCert ? 'HTTPS' : 'HTTP'} server on port ${PORT}`);
}

module.exports = { createServer };