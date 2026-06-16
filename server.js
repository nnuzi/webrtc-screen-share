const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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


    socket.on("disconnect", (socket) => {
        console.log('有设备断开:', socket);
    })

});


const PORT = 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器已启动，请访问 http://localhost:${PORT}/sender.html`);
});