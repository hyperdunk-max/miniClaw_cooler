# mini-openclaw-feishu 中文说明

这是一个受 OpenClaw 思路启发的最小可用飞书机器人服务，支持：
- 飞书 webhook 收消息并自动回复
- OpenAI 兼容接口（可换任意兼容 API）
- 会话串行队列（同会话不并发）
- 定时任务主动推送

## 一、快速开始（本机）

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

```bash
cp .env.example .env
```

至少需要填写：
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `LLM_API_KEY`

可选：
- `LLM_BASE_URL`（默认 `https://api.openai.com/v1`）
- `LLM_MODEL`（默认 `gpt-4o-mini`）
- `SCHEDULE_CRON` / `SCHEDULE_JOBS_JSON`

### 3) 启动

```bash
npm run start
```

启动后接口：
- `GET /healthz`
- `POST /webhook/feishu`

## 二、飞书机器人配置

在飞书开放平台配置事件订阅回调 URL：

```text
https://你的域名/webhook/feishu
```

当前最小版支持：
- `url_verification` 校验
- `im.message.receive_v1` 文本消息处理

注意：
- 该最小版暂不支持飞书 `encrypt` 加密事件体。
- 需要给机器人开通收发消息相关权限。

## 三、一键部署（Docker）

### 方式 A：脚本一键（推荐）

Linux / macOS:

```bash
bash scripts/deploy.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

脚本会做这些事：
1. 检查 Docker / Docker Compose 是否可用。
2. 若 `.env` 不存在，自动从 `.env.example` 复制。
3. 校验必要配置（飞书 AppId/Secret、LLM Key）。
4. 自动 `docker compose up -d --build`。

### 方式 B：手动 Docker

```bash
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f app
```

停止服务：

```bash
docker compose down
```

## 四、定时任务配置

### 单任务

```env
SCHEDULE_CRON=*/30 * * * *
SCHEDULE_TARGET_CHAT_ID=oc_xxx
SCHEDULE_PROMPT=请发一条系统巡检摘要
```

### 多任务（优先级更高）

```env
SCHEDULE_JOBS_JSON=[{"name":"morning","cron":"0 9 * * *","chatId":"oc_xxx","prompt":"早报"},{"name":"noon","cron":"0 12 * * *","chatId":"oc_xxx","prompt":"午间状态"}]
```

## 五、常见问题

1. 收不到飞书回调
- 先确认公网可访问回调地址。
- 用 `GET /healthz` 确认服务在线。

2. 机器人不回复
- 检查飞书权限与事件订阅。
- 检查 `LLM_API_KEY` 是否正确。
- 查看容器日志 `docker compose logs -f app`。

3. 定时任务不触发
- 检查 cron 表达式是否正确。
- 检查目标 `chatId` 是否可发送。

## 六、项目结构

- `src/index.js` 主入口（webhook、调度、消息处理）
- `src/queue.js` 会话级串行队列
- `src/llm.js` LLM 调用
- `src/feishu.js` 飞书接口封装
- `docker-compose.yml` 容器编排
- `scripts/deploy.sh` / `scripts/deploy.ps1` 一键部署脚本
