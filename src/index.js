require("dotenv").config();

const express = require("express");
const cron = require("node-cron");

const { loadConfig } = require("./config");
const { FeishuClient } = require("./feishu");
const { startFeishuWebSocket } = require("./feishu-ws");
const { chatCompletion } = require("./llm");
const { runInSessionQueue } = require("./queue");

const config = loadConfig();
const app = express();
app.use(express.json({ limit: "1mb" }));

const feishu = new FeishuClient({
  appId: config.feishu.appId,
  appSecret: config.feishu.appSecret,
});

const sessionHistory = new Map();
const seenMessageIds = new Map();

function markMessageSeen(messageId) {
  if (!messageId) {
    return false;
  }
  const now = Date.now();
  const existing = seenMessageIds.get(messageId);
  if (existing && now - existing < 10 * 60 * 1000) {
    return true;
  }
  seenMessageIds.set(messageId, now);
  if (seenMessageIds.size > 5000) {
    const expireBefore = now - 10 * 60 * 1000;
    for (const [id, ts] of seenMessageIds.entries()) {
      if (ts < expireBefore) {
        seenMessageIds.delete(id);
      }
    }
  }
  return false;
}

function readSessionHistory(sessionKey) {
  return sessionHistory.get(sessionKey) || [];
}

function writeSessionHistory(sessionKey, messages) {
  const cap = Math.max(1, config.runtime.historyTurns) * 2;
  const trimmed = messages.slice(-cap);
  sessionHistory.set(sessionKey, trimmed);
}

function buildMessages(sessionKey, userText) {
  const prior = readSessionHistory(sessionKey);
  return [
    { role: "system", content: config.llm.systemPrompt },
    ...prior,
    { role: "user", content: userText },
  ];
}

function safeParseFeishuText(contentRaw) {
  if (!contentRaw || typeof contentRaw !== "string") {
    return "";
  }
  try {
    const data = JSON.parse(contentRaw);
    if (typeof data.text === "string") {
      return data.text.trim();
    }
    return "";
  } catch {
    return "";
  }
}

function normalizeInboundEvent(payload) {
  if (payload && payload.message) {
    return payload;
  }
  if (payload && payload.event && payload.event.message) {
    return payload.event;
  }
  return payload;
}

async function handleIncomingMessage(payload) {
  const event = normalizeInboundEvent(payload);
  const message = event?.message;
  if (!message || message.message_type !== "text") {
    return;
  }

  if (markMessageSeen(message.message_id)) {
    return;
  }

  const chatId = (message.chat_id || "").trim();
  if (!chatId) {
    return;
  }

  const userText = safeParseFeishuText(message.content);
  if (!userText) {
    return;
  }

  await runInSessionQueue(chatId, async () => {
    const messages = buildMessages(chatId, userText);
    try {
      const answer = await chatCompletion({
        baseUrl: config.llm.baseUrl,
        apiKey: config.llm.apiKey,
        model: config.llm.model,
        timeoutMs: config.llm.timeoutMs,
        messages,
      });

      writeSessionHistory(chatId, [
        ...readSessionHistory(chatId),
        { role: "user", content: userText },
        { role: "assistant", content: answer },
      ]);

      await feishu.sendTextMessage({
        receiveIdType: "chat_id",
        receiveId: chatId,
        text: answer,
      });
    } catch (err) {
      const reason = String(err);
      console.error(`[reply-error] chat=${chatId} err=${reason}`);
      await feishu.sendTextMessage({
        receiveIdType: "chat_id",
        receiveId: chatId,
        text: `Error: ${reason.slice(0, 300)}`,
      });
    }
  });
}

function enqueueIncomingMessage(payload, source) {
  handleIncomingMessage(payload).catch((err) => {
    console.error(`[${source}-event-error] ${String(err)}`);
  });
}

function startScheduleJobs() {
  for (const job of config.schedules) {
    if (!cron.validate(job.cron)) {
      console.error(`[schedule-skip] invalid cron for ${job.name}: ${job.cron}`);
      continue;
    }

    cron.schedule(job.cron, async () => {
      const sessionKey = `schedule:${job.chatId}`;
      await runInSessionQueue(sessionKey, async () => {
        const nowIso = new Date().toISOString();
        const prompt = `${job.prompt}\n\nCurrent time: ${nowIso}`;
        const messages = [
          { role: "system", content: config.llm.systemPrompt },
          { role: "user", content: prompt },
        ];
        try {
          const answer = await chatCompletion({
            baseUrl: config.llm.baseUrl,
            apiKey: config.llm.apiKey,
            model: config.llm.model,
            timeoutMs: config.llm.timeoutMs,
            messages,
          });
          await feishu.sendTextMessage({
            receiveIdType: "chat_id",
            receiveId: job.chatId,
            text: answer,
          });
          console.log(`[schedule-ok] ${job.name} -> ${job.chatId}`);
        } catch (err) {
          console.error(`[schedule-error] ${job.name} err=${String(err)}`);
        }
      });
    });

    console.log(`[schedule-start] ${job.name} cron=${job.cron} chat=${job.chatId}`);
  }
}

app.get("/healthz", (req, res) => {
  res.json({
    ok: true,
    model: config.llm.model,
    schedules: config.schedules.length,
    feishuMode: config.feishu.connectionMode,
  });
});

app.post("/webhook/feishu", (req, res) => {
  if (config.feishu.connectionMode !== "webhook") {
    res.status(409).json({ error: "Webhook mode disabled. Set FEISHU_CONNECTION_MODE=webhook." });
    return;
  }

  const body = req.body;
  if (config.runtime.logBody) {
    console.log("[webhook-body]", JSON.stringify(body));
  }

  if (body && body.encrypt) {
    res.status(400).json({ error: "Encrypted event not supported in this minimal build" });
    return;
  }

  if (body && body.type === "url_verification") {
    if (config.feishu.verifyToken && body.token !== config.feishu.verifyToken) {
      res.status(403).json({ error: "verify token mismatch" });
      return;
    }
    res.json({ challenge: body.challenge });
    return;
  }

  res.json({ code: 0 });

  const eventType = body?.header?.event_type;
  if (eventType === "im.message.receive_v1") {
    enqueueIncomingMessage(body.event, "webhook");
  }
});

app.listen(config.port, () => {
  console.log(`mini-openclaw-feishu listening on :${config.port}`);
  console.log(`model=${config.llm.model} base=${config.llm.baseUrl}`);
  console.log(`feishu_connection_mode=${config.feishu.connectionMode}`);
  startScheduleJobs();

  if (config.feishu.connectionMode === "websocket") {
    startFeishuWebSocket({
      appId: config.feishu.appId,
      appSecret: config.feishu.appSecret,
      verifyToken: config.feishu.verifyToken,
      logBody: config.runtime.logBody,
      onMessage: (event) => {
        enqueueIncomingMessage(event, "websocket");
      },
    });
  } else {
    console.log("[feishu-webhook] waiting for callback on POST /webhook/feishu");
  }
});
