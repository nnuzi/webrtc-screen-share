# WebRTC Screen Share — AI Agent Context

## Project Overview

Real-time screen sharing app using WebRTC + Socket.IO. Sender (desktop) pushes screen capture to receivers (tablets, laptops) over LAN via P2P media stream. Server acts only as signaling relay — media never passes through server.

## Architecture

```
Sender (sender.html)                    Receiver (receiver.html)
  │  create room → QR code              │  scan QR / ?room= to join
  │  wait for receiver to join          │  emit('ready') on connect
  │  getDisplayMedia + offer            │  setRemote(offer) → createAnswer
  │  sets H.264 codec preference        │  double-click to fullscreen
  └──→ Socket.IO (signaling) ←───────────┘
         │  Express static server
         │  port 3000, binds 0.0.0.0
         │  GET /api/server-info → { ip, port }
```

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express + Socket.IO signaling server (entry point); exposes `/api/server-info` |
| `public/sender.html` | Screen share sender — create room, wait for receiver, then `getDisplayMedia` + WebRTC offer |
| `public/receiver.html` | Viewer — joins room via `?room=`, emits `ready`, receives offer, plays video |
| `public/WebRTCManager.js` | `RTCPeerConnection` wrapper with ICE candidate queuing |
| `PLAN.md` | Development roadmap (4 phases) |
| `package.json` | Deps: express ^5.2.1, socket.io ^4.8.3 |

## Server Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/server-info` | Returns `{ ip, port, protocol }` — LAN IP or `PUBLIC_URL` if set |
| `socket.io/` | Socket.IO signaling |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PUBLIC_URL` | Overrides `/api/server-info` with public address (e.g. `https://12.34.56.78`) |

## WebRTCManager Class (`public/WebRTCManager.js`)

- Extends `EventTarget` — emits `icecandidate`, `track`, `statechange`
- Queues ICE candidates if remote description not yet set
- `addRemoteCandidate(candidate)` — queues or adds ICE candidate
- `setRemote(desc)` — sets remote description, flushes queued candidates

## Sender Flow (`sender.html`)

### Page — State Machine

| State | Share Button | Stop Button |
|-------|-------------|-------------|
| **landing** (before room) | — | — |
| **room created** (waiting) | disabled "等待接收端加入..." | "退出房间" → go to landing |
| **receiver joined** | enabled "开始屏幕共享" | "退出房间" → go to landing |
| **sharing** | "共享中" (disabled) | "停止共享" → close PC, reset |
| **stopped** | "开始屏幕共享" (enabled) | "退出房间" → go to landing |

### Steps

1. Page loads → fetches `/api/server-info` for LAN IP, fills address field
2. **Must use `http://localhost:3000/sender.html`** (non-localhost HTTP blocks `getDisplayMedia`)
3. Click **"创建共享房间"** → generates 6-char room code, connects socket, shows QR code
4. Waits for `receiver-ready` event (receiver emits `ready`, server relays it)
5. Click **"开始屏幕共享"** → `getDisplayMedia` with 2K/60fps H.264
6. `contentHint = 'motion'` for video track
7. `setCodecPreferences(['video/H264'])` via `RTCRtpSender.getCapabilities`
8. Create offer → `setLocalDescription` → emit via socket
9. Receives answer + candidates from server broadcast
10. Browser's "Stop Sharing" button → `videoTrack.onended` → `stopSharing()`

## Receiver Flow (`receiver.html`)

1. Opens `receiver.html?room=<roomCode>` (via QR code or manual URL)
2. Connects socket → emits `ready` → server broadcasts `receiver-ready` to room
3. Listens for `offer` from server
4. `setRemote(offer)` → `createAnswer()` → `setLocalDescription(answer)` → emit
5. `ontrack` sets `video.srcObject` → overlay hides → video plays
6. Double-click body to toggle fullscreen

## Run Commands

```bash
npm install
node server.js
# Sender: http://localhost:3000/sender.html        (must use localhost!)
# Receiver: http://<lan-ip>:3000/receiver.html?room=xxx
```

## Notes for AI

- All client JS is vanilla (no framework), inline in HTML
- `WebRTCManager.js` is shared between sender and receiver
- Socket.IO is loaded from server-side `/socket.io/socket.io.js`
- No test framework configured (`package.json` test is placeholder)
- Express v5 uses `req.query` changes vs v4; be aware if adding routes
- Prefer H.264 codec; fallback to browser default if unavailable
- QR code generated via external API (`api.qrserver.com`)
- Sender page MUST be accessed via `localhost` due to `getDisplayMedia` secure context requirement
- Receiver `?room=` parameter is required; missing it shows error overlay
- Room isolation is implemented — multiple `?room=` groups don't interfere
