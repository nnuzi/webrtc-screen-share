# WebRTC Screen Share — AI Agent Context

## Project Overview

Real-time screen sharing app using WebRTC + Socket.IO. Sender (desktop) pushes screen capture to receivers (tablets, laptops) over LAN via P2P media stream. Server acts only as signaling relay — media never passes through server.

## Architecture

```
Sender (sender.html)                    Receiver (receiver.html)
  │  getDisplayMedia capture             │  <video> plays remote stream
  │  creates RTCPeerConnection (offer)   │  creates RTCPeerConnection (answer)
  │  sets H.264 codec preference         │  double-click to fullscreen
  └──→ Socket.IO (signaling) ←───────────┘
         │  Express static server
         │  port 3000, binds 0.0.0.0
```

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express + Socket.IO signaling server (entry point) |
| `public/sender.html` | Screen share sender — `getDisplayMedia` + WebRTC offer |
| `public/receiver.html` | Viewer — receives offer, creates answer, plays video |
| `public/WebRTCManager.js` | `RTCPeerConnection` wrapper with ICE candidate queuing |
| `PLAN.md` | Development roadmap (4 phases) |
| `package.json` | Deps: express ^5.2.1, socket.io ^4.8.3 |

## WebRTCManager Class (`public/WebRTCManager.js`)

- Extends `EventTarget` — emits `icecandidate`, `track`, `statechange`
- Queues ICE candidates if remote description not yet set
- `addRemoteCandidate(candidate)` — queues or adds ICE candidate
- `setRemote(desc)` — sets remote description, flushes queued candidates

## Sender Flow (`sender.html`)

1. Click "开始屏幕共享" → `getDisplayMedia` with 2K/60fps H.264
2. `contentHint = 'motion'` for video track
3. `setCodecPreferences(['video/H264'])` via `RTCRtpSender.getCapabilities`
4. Create offer → `setLocalDescription` → emit via socket
5. Receives answer + candidates from server broadcast

## Receiver Flow (`receiver.html`)

1. Listens for `offer` from server
2. `setRemote(offer)` → `createAnswer()` → `setLocalDescription(answer)` → emit
3. `ontrack` sets `video.srcObject`
4. Double-click body to toggle fullscreen

## Known Tech Debt (from PLAN.md)

- `server.js` disconnect callback: param name `socket` shadows outer variable; logs object instead of ID
- receiver fullscreen `catch` has unused variable
- No room isolation (all clients share same signaling channel)
- No STUN/TURN configured — LAN only
- No ICE restart / reconnection logic
- No connection state indicators on UI

## Run Commands

```bash
npm install
node server.js
# Sender: http://<local-ip>:3000/sender.html
# Receiver: http://<local-ip>:3000/receiver.html
```

## Notes for AI

- All client JS is vanilla (no framework), inline in HTML
- `WebRTCManager.js` is shared between sender and receiver
- Socket.IO is loaded from server-side `/socket.io/socket.io.js`
- No test framework configured (`package.json` test is placeholder)
- Express v5 uses `req.query` changes vs v4; be aware if adding routes
- Prefer H.264 codec; fallback to browser default if unavailable
