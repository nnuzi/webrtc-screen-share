# WebRTC Screen Share

[中文文档](README_zh.md)

Real-time screen sharing over LAN via WebRTC + Socket.IO. No apps, no cables, no accounts.

Sender (desktop) captures screen and streams it P2P to receivers (tablets, phones, laptops) on the same network. The server acts only as a signaling relay — media never passes through the server.

## Features

- **P2P streaming** — media flows directly between sender and receiver, low latency
- **Zero setup** — open browser, scan QR code, start sharing
- **Room isolation** — multiple concurrent sessions don't interfere
- **QR code join** — receiver scans to connect, no manual URL entry
- **Auto reconnection** — recovers from brief disconnections without manual refresh
- **Fullscreen mode** — double-click receiver video to toggle fullscreen
- **i18n** — auto-detects browser language (zh/en), lazy-loads language packs
- **Docker** — one-command deployment with self-signed HTTPS
- **Cloudflare Tunnel** — public access via `*.trycloudflare.com`, no inbound port config needed

## How It Works

```
Sender                              Receiver
  │                                   │
  │  1. Create room → QR code         │  2. Scan QR / open ?room= URL
  │                                   │
  │  3. getDisplayMedia               │
  │     → WebRTC offer                │
  │     → send via Socket.IO ────────→│  4. Receive offer → create answer
  │                                   │     → send via Socket.IO
  │←──────────────────────────────────│
  │                                   │
  │  ═══════ P2P media stream ════════│  5. Video plays
  │                                   │
  │  Socket.IO only for signaling     │
```

## Quick Start

### Local Development

```bash
git clone https://github.com/nnuzi/webrtc-screen-share.git
cd webrtc-screen-share
npm install
npm start
```

- **Sender**: http://localhost:3000/sender.html (must use `localhost` for `getDisplayMedia` to work)
- **Receiver**: http://localhost:3000/receiver.html?room=YOUR_ROOM

### Docker

```bash
docker build -t wss .
docker run -d --restart unless-stopped -p 443:443 --name wss wss
```
