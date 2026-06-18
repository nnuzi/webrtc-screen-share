# WebRTC Screen Share

基于 WebRTC 和 Socket.IO 的实时屏幕共享应用，支持桌面端向局域网内其他设备（平板、笔记本等）推送屏幕画面。

## 功能特性

- **实时屏幕共享** — 通过 WebRTC（`getDisplayMedia` + `RTCPeerConnection`）实现端到端推流
- **H.264 视频编码** — 优先选用 H.264，兼容性更广
- **房间隔离** — 多组用户可在同一服务器上同时使用，互不干扰
- **二维码扫码加入** — 接收端扫描发送端二维码即可进入房间
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

- **发送端** — 创建房间 → 等待接收端加入 → 调用 `getDisplayMedia` 捕获屏幕 → 创建 WebRTC offer
- **接收端** — 扫码加入房间 → 接收 offer → 创建 answer → 播放远端视频流
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
├── AGENTS.md               # AI 助手上下文说明
└── Dockerfile              # Docker 部署
```

## 使用方法

```bash
# 安装依赖
npm install

# 启动服务器（默认端口 3000）
node server.js
```

1. **发送端** — 在桌面电脑打开 **`http://localhost:3000/sender.html`**（必须使用 localhost，否则 `getDisplayMedia` 不可用）
2. 点击 **"创建共享房间"**，页面生成房间号和二维码
3. **接收端** — 在其他设备扫描二维码，或手动打开 `http://<服务器IP>:3000/receiver.html?room=<房间号>`
4. 发送端收到"接收端已加入"提示后，点击 **"开始屏幕共享"**，选择要共享的窗口或屏幕
5. 双击接收端视频可全屏显示

## 部署到 AWS

项目包含完整的 Terraform 配置，一键部署到 AWS EC2：

```bash
cd terraform
terraform init
terraform plan -var="github_repo=你的用户名/webrtc-screen-share" -var="github_token=你的GitHubToken"
terraform apply
```

部署后自动：
- 创建 VPC、子网、安全组（开放 22 和 443 端口）
- 启动 EC2 实例（默认 t3.micro）
- 安装 Docker 并构建镜像
- 使用 HTTPS（自签名证书）+ 自动检测公网 IP 设置 `PUBLIC_URL`

> 自签名证书首次访问会提示安全警告，点击 "Advanced" → "Proceed" 继续。如需正式证书，可配置 `PUBLIC_URL` 环境变量 + 替换证书。

## 环境变量

| 变量 | 作用 | 示例 |
|------|------|------|
| `PUBLIC_URL` | 覆盖服务端公网地址 | `PUBLIC_URL=https://example.com` |

## 技术栈

- **Node.js** — 服务端运行环境
- **Express** — 静态文件服务
- **Socket.IO** — WebRTC 信令中继
- **WebRTC**（浏览器原生 API）— 点对点媒体传输

## 开发计划

详见 [`PLAN.md`](./PLAN.md)，已完成：

- ✅ 房间管理（Socket.IO rooms + `?room=` 参数）
- □ STUN/TURN 配置
- □ ICE 重连
- □ 错误处理
