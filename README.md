# WebRTC Screen Share

基于 WebRTC 和 Socket.IO 的实时屏幕共享应用，支持桌面端向局域网内其他设备（平板、笔记本等）推送屏幕画面。

## 功能特性

- **实时屏幕共享** — 通过 WebRTC（`getDisplayMedia` + `RTCPeerConnection`）实现端到端推流
- **H.264 视频编码** — 优先选用 H.264，兼容性更广
- **接收端全屏** — 双击视频画面切换全屏
- **跨设备支持** — 任何现代浏览器均可作为接收端，无需安装 App
- **信令中继** — 服务器仅转发信令消息，媒体流不经过服务器

## 工作原理

```
发送端（桌面）                       接收端（平板/手机等）
     │                                      │
     │──── SDP offer ────────────────────→ │
     │←─── SDP answer ──────────────────── │
     │←─── ICE candidates ──────────────── │
     │──── ICE candidates ────────────────→│
     │══════════ 媒体流 (P2P) ════════════ │
```

- **发送端** — 调用 `getDisplayMedia` 捕获屏幕，创建 WebRTC offer，通过服务器转发信令
- **接收端** — 接收 offer 并创建 answer，播放远端视频流
- **服务器** — Express + Socket.IO，仅作信令中转，不处理媒体数据

## 项目结构

```
├── server.js               # Express + Socket.IO 信令服务器（入口）
├── package.json
├── PLAN.md                 # 开发计划
├── public/
│   ├── sender.html         # 屏幕共享发送端页面
│   ├── receiver.html       # 屏幕接收端页面
│   └── WebRTCManager.js    # WebRTC 封装类
└── public copy/            # 旧版本备份（未使用）
```

## 使用方法

```bash
# 安装依赖
npm install

# 启动服务器（默认端口 3000）
node server.js
```

1. **发送端** — 在桌面电脑打开 `http://<本机IP>:3000/sender.html`，点击 **"开始屏幕共享"**，选择要共享的窗口或屏幕
2. **接收端** — 在其他设备打开 `http://<发送端IP>:3000/receiver.html`，即可观看
3. 双击接收端视频可全屏显示

> ⚠️ 默认未配置 STUN/TURN 服务器，仅限同一局域网内使用。如需跨网络分享，需在 `RTCPeerConnection` 构造函数中添加 STUN/TURN 配置。

## 技术栈

- **Node.js** — 服务端运行环境
- **Express** — 静态文件服务
- **Socket.IO** — WebRTC 信令中继
- **WebRTC**（浏览器原生 API）— 点对点媒体传输

## 开发计划

详见 [`PLAN.md`](./PLAN.md)，主要规划：

- **阶段一**：房间管理、STUN/TURN 配置、ICE 重连、错误处理
- **阶段二**：连接状态指示、系统音频、断开通知、自动重连
- **阶段三**：一播多广播、带宽自适应、发送端预览、录制、文字聊天
- **阶段四**：HTTPS、Docker 化、前端打包、测试
