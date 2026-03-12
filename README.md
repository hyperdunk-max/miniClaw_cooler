# mini-openclaw-feishu

中文文档: [README.zh-CN.md](./README.zh-CN.md)

A minimal Feishu bot service inspired by OpenClaw core ideas:
- webhook or websocket (long connection) event mode
- per-session queue serialization
- OpenAI-compatible API key/model config
- cron-based proactive scheduled messages

## 1) Install

```bash
npm install
```

## 2) Configure

```bash
cp .env.example .env
```

Important envs:
- `FEISHU_APP_ID`, `FEISHU_APP_SECRET`
- `FEISHU_CONNECTION_MODE` = `websocket` (recommended)
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`

## 3) Run

```bash
npm run start
```

One-click deploy (Docker):

```bash
# Linux / macOS
bash scripts/deploy.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

Service endpoints:
- `GET /healthz`
- `POST /webhook/feishu` (only for webhook mode)
