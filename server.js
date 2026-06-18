const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const os = require('os');

const certPath = '/etc/ssl/certs/server.crt';
const keyPath = '/etc/ssl/private/server.key';
const hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);
const PORT = hasCert ? 443 : 3000;

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

function getLanIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
}

app.get('/api/server-info', (req, res) => {
    const protocol = hasCert ? 'https' : 'http';
    if (process.env.PUBLIC_URL) {
        const url = new URL(process.env.PUBLIC_URL);
        res.json({ ip: url.hostname, port: url.port || (protocol === 'https' ? '443' : '3000'), protocol });
        return;
    }
    res.json({ ip: getLanIp(), port: PORT, protocol });
});

// 托管 public 文件夹中的静态页面
app.use(express.static('public'));

io.on('connection', (socket) => {
    const room = socket.handshake.query.room || 'default';
    socket.join(room);
    console.log(`[${room}] 设备连接:`, socket.id);

    socket.on('offer', (offer) => {
        socket.to(room).emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.to(room).emit('answer', answer);
    });

    // 转发网络候选者 (双向互相寻找连接点)
    socket.on('candidate', (candidate) => {
        socket.to(room).emit('candidate', candidate);
    });

    socket.on('ready', () => {
        socket.to(room).emit('receiver-ready');
    });

    socket.on('disconnect', () => {
        console.log(`[${room}] 设备断开:`, socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`${hasCert ? 'HTTPS' : 'HTTP'} server on port ${PORT}`);
});