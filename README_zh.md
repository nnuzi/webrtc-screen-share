# WebRTC 屏幕共享

[English](README.md)

基于 WebRTC + Socket.IO 的局域网实时屏幕共享工具。无需安装任何 App，无需连接数据线，打开浏览器即可使用。

桌面端捕获屏幕画面，通过 P2P 直接推送到接收端（平板、手机、笔记本）。服务器仅负责信令转发，媒体流不经过服务器。

## 功能特性

- **P2P 推流** — 媒体流直接在发送端和接收端之间传输，低延迟
- **零配置** — 打开浏览器，扫描二维码，即可开始共享
- **房间隔离** — 多组用户同时使用，互不干扰
- **扫码加入** — 接收端扫描二维码即可连接，无需手动输入地址
- **自动重连** — 短暂断连后自动恢复，无需手动刷新
- **全屏模式** — 双击接收端视频即可全屏显示
- **多语言** — 自动检测浏览器语言（中文/英文），按需加载语言包
- **Docker 部署** — 一条命令启动，内置自签名 HTTPS 证书
- **Cloudflare 隧道** — 通过 `*.trycloudflare.com` 公网访问，无需开放入站端口

## 工作原理

```
发送端                                接收端
  │                                   │
  │  1. 创建房间 → 生成二维码          │  2. 扫描二维码 / 打开 ?room= 链接
  │                                   │
  │  3. getDisplayMedia               │
  │     → 创建 WebRTC offer           │
  │     → 通过 Socket.IO 发送 ───────→│  4. 收到 offer → 创建 answer
  │                                   │     → 通过 Socket.IO 回传
  │←──────────────────────────────────│
  │                                   │
  │  ═══════ P2P 媒体流 ══════════════│  5. 视频播放
  │                                   │
  │  Socket.IO 仅用于信令交换          │
```

## 快速开始

### 本地开发

```bash
git clone https://github.com/nnuzi/webrtc-screen-share.git
cd webrtc-screen-share
npm install
npm start
```

- **发送端**: http://localhost:3000/sender.html（必须使用 `localhost`，否则 `getDisplayMedia` 无法工作）
- **接收端**: http://localhost:3000/receiver.html?room=YOUR_ROOM

### Docker

```bash
docker build -t wss .
docker run -d --restart unless-stopped -p 443:443 --name wss wss
```
