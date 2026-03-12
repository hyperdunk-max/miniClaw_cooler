# mini-openclaw-feishu 中文说明

这是一个受 OpenClaw 思路启发的最小可用飞书机器人服务，支持：
- 飞书长连接模式（WebSocket，不需要公网回调）
- 飞书 webhook 模式（兼容）
- OpenAI 兼容接口（可换任意兼容 API）
- 会话串行队列（同会话不并发）
- 定时任务主动推送

## 一、最简单启动（推荐长连接）

### 1) 安装依赖

```cmd
npm install
```

### 2) 配置环境变量

```cmd
copy .env.example .env
notepad .env
```

至少填写：
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `LLM_API_KEY`

并确认：
- `FEISHU_CONNECTION_MODE=websocket`

### 3) 启动

```cmd
npm run start
```

验证：

```cmd
curl http://localhost:3000/healthz
```

返回里有 `"feishuMode":"websocket"` 就对了。

## 二、Ollama 配置示例

### 本机 Node 启动时

```env
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:7b
```

### Docker 启动机器人服务时

```env
LLM_BASE_URL=http://host.docker.internal:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:7b
```

## 三、飞书侧配置（长连接模式）

在飞书开放平台中：
1. 选择你的应用。
2. 在事件订阅里切到“长连接订阅模式”。
3. 订阅事件 `im.message.receive_v1`。
4. 给机器人开通收发消息相关权限。

长连接模式下，不需要公网 webhook 地址。

## 四、如果你要 webhook 模式

把 `.env` 改成：

```env
FEISHU_CONNECTION_MODE=webhook
```

然后配置飞书回调地址到：

```text
https://你的域名/webhook/feishu
```

## 五、一键部署（Docker）

Windows:

```cmd
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

Linux/macOS:

```bash
bash scripts/deploy.sh
```

## 六、项目结构

- `src/index.js` 主入口（webhook + websocket + 调度）
- `src/feishu-ws.js` 飞书长连接客户端
- `src/queue.js` 会话级串行队列
- `src/llm.js` LLM 调用
- `src/feishu.js` 飞书发送消息封装
