# mini-openclaw-feishu

中文文档: [README.zh-CN.md](./README.zh-CN.md)

A minimal Feishu bot service inspired by OpenClaw core ideas:
- webhook-driven message handling
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

Fill `.env`:
- `FEISHU_APP_ID`, `FEISHU_APP_SECRET`
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`
- optional schedule settings

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
- `POST /webhook/feishu`

## 4) Feishu app setup

Use a Feishu bot app and configure event callback URL to:

```text
https://<your-domain>/webhook/feishu
```

Notes:
- URL verification (`challenge`) is supported.
- This minimal build does **not** support encrypted event payload mode (`encrypt`).
- Grant bot permissions for receiving and sending messages.

## 5) Schedule examples

Single job:

```env
SCHEDULE_CRON=*/30 * * * *
SCHEDULE_TARGET_CHAT_ID=oc_xxx
SCHEDULE_PROMPT=Please send me a short ops heartbeat.
```

Multiple jobs:

```env
SCHEDULE_JOBS_JSON=[{"name":"morning","cron":"0 9 * * *","chatId":"oc_xxx","prompt":"Morning digest"}]
```

## Design notes

- Per-chat queue avoids concurrent runs in the same session.
- In-memory context keeps recent turns (`HISTORY_TURNS`).
- LLM endpoint is OpenAI-compatible (`/chat/completions`).
