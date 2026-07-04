const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const os = require('os');

const certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt';
const keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key';
const hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (hasCert ? 443 : 3000);

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
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    const host = req.headers.host || (getLanIp() + ':' + PORT);
    const proto = req.headers['x-forwarded-proto'] || (hasCert ? 'https' : 'http');
    const parts = host.split(':');
    const ip = parts[0];
    const port = parts[1] || (proto === 'https' ? '443' : '80');
    res.json({ ip, port, protocol: proto });
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

        socket.on('disconnect', () => {
            socket.to(room).emit('peer-disconnected', { room });
        });
    });

    server.listen(port !== undefined ? port : PORT, process.env.BIND_ADDRESS || '0.0.0.0');
    return { app, io, server };
}

if (require.main === module) {
    createServer(PORT);
    console.log(`${hasCert ? 'HTTPS' : 'HTTP'} server on port ${PORT}`);
}

module.exports = { createServer };