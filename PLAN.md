# WebRTC Screen Share — 开发计划

## 阶段一：核心稳定性（P0 — 必须）

| # | 任务 | 说明 | 难度 |
|---|------|------|------|
| 1 | **房间管理** | Socket.IO rooms 隔离会话，支持 `?room=xxx` 参数配对，避免多客户端冲突 | ★★☆ |
| 2 | **STUN/TURN 配置** | 添加 Google STUN，支持环境变量配置 TURN，跨网络可用 | ★☆☆ |
| 3 | **ICE 重启与重连** | 监听 `connectionstatechange`，`failed` 时自动 restartIce + 重新 offer | ★★☆ |
| 4 | **错误处理** | Sender 端 `getDisplayMedia` 拒绝/中止捕获的 try/catch，信令异常处理，用户可感知的提示 | ★☆☆ |

## 阶段二：用户体验（P1 — 重要）

| # | 任务 | 说明 | 难度 |
|---|------|------|------|
| 5 | **连接状态指示** | 接收端显示状态灯（等待中/连接中/已连接/已断开），sender 端显示连接状态 | ★☆☆ |
| 6 | **系统音频支持** | 添加 `audio: true`，可选是否采集系统音频 | ★☆☆ |
| 7 | **断开/停止共享通知** | 一方断开时另一方收到通知并重置 UI（currently receiver stays on last frame） | ★☆☆ |
| 8 | **自动重连** | 短暂断连后自动恢复，无需手动刷新 | ★★☆ |
| 9 | **清理 public copy/** | 删除过期备份目录 | ★☆☆ |

## 阶段三：功能增强（P2 — 锦上添花）

| # | 任务 | 说明 | 难度 |
|---|------|------|------|
| 10 | **一播多（Broadcast）** | 一个 sender 同时推流给多个 receiver，适用于演示/教学场景 | ★★★ |
| 11 | **带宽自适应** | 通过 `RTCRtpSender.setParameters` / `getStats` 动态调节码率 | ★★★ |
| 12 | **发送端预览** | sender 页面显示自己的共享画面（pip 小窗） | ★☆☆ |
| 13 | **录制功能** | 在发送端或接收端用 `MediaRecorder` 录制共享会话 | ★★☆ |
| 14 | **文字聊天** | 在信令通道基础上增加简单的文本消息交换 | ★☆☆ |

## 阶段四：工程化（P3 — 可选）

| # | 任务 | 说明 | 难度 |
|---|------|------|------|
| 15 | **HTTPS 支持** | 生产环境必须，WebRTC 在非 localhost 上强制要求安全上下文 | ★☆☆ |
| 16 | **Docker 化** | 提供 Dockerfile，一键部署 | ★☆☆ |
| 17 | **前端打包** | 接入 Vite/webpack，支持 TypeScript、ESM 模块化 | ★★☆ |
| 18 | **单元 / E2E 测试** | 用 Jest + Playwright 覆盖核心信令逻辑 | ★★★ |

---

## 技术债务 / 快速修复

- 删除 `public copy/` 目录 —— 死代码混淆项目
- `server.js` disconnect 回调有 bug：参数名 `socket` 与闭包冲突，`console.log` 输出的是 socket 对象而非 ID
- 接收端 `double-click` 全屏的 `catch` 中变量未使用
- `package.json` 中 `test` 命令是占位符，可改为 `echo "No tests yet"` 更明确

---

## 执行策略

- **短期（阶段一）**：建议一次性完成 P0 的 4 项，这是从"demo"到"可用工具"的门槛
- **中期（阶段二）**：按需推进，连接状态指示和音频支持价值最高
- **长期**：结合实际使用场景选择阶段三/四的条目
