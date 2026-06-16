const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');

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

// 托管 public 文件夹中的静态页面
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('有设备连接:', socket.id);

    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    // 转发网络候选者 (双向互相寻找连接点)
    socket.on('candidate', (candidate) => {
        socket.broadcast.emit('candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('有设备断开:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`${hasCert ? 'HTTPS' : 'HTTP'} server on port ${PORT}`);
});