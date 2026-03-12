const DEFAULT_PORT = 3000;
const DEFAULT_LLM_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_LLM_MODEL = "gpt-4o-mini";
const DEFAULT_SYSTEM_PROMPT = "You are a concise and practical AI assistant.";
const DEFAULT_FEISHU_CONNECTION_MODE = "websocket";

function required(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function optional(name, fallback = "") {
  const value = (process.env[name] || "").trim();
  return value || fallback;
}

function parseNumber(name, fallback) {
  const raw = (process.env[name] || "").trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number env ${name}: ${raw}`);
  }
  return parsed;
}

function parseBool(name, fallback = false) {
  const raw = (process.env[name] || "").trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(raw);
}

function parseConnectionMode() {
  const raw = (process.env.FEISHU_CONNECTION_MODE || "").trim().toLowerCase();
  const mode = raw || DEFAULT_FEISHU_CONNECTION_MODE;
  if (mode !== "websocket" && mode !== "webhook") {
    throw new Error(`Invalid FEISHU_CONNECTION_MODE: ${mode}. Use websocket or webhook.`);
  }
  return mode;
}

function parseScheduleJobs() {
  const jsonRaw = (process.env.SCHEDULE_JOBS_JSON || "").trim();
  if (jsonRaw) {
    let parsed;
    try {
      parsed = JSON.parse(jsonRaw);
    } catch (err) {
      throw new Error(`Invalid SCHEDULE_JOBS_JSON: ${String(err)}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error("SCHEDULE_JOBS_JSON must be a JSON array");
    }
    return parsed.map((job, index) => {
      if (!job || typeof job !== "object") {
        throw new Error(`Invalid schedule job at index ${index}`);
      }
      const cron = String(job.cron || "").trim();
      const chatId = String(job.chatId || "").trim();
      const prompt = String(job.prompt || "Daily check-in").trim();
      if (!cron || !chatId) {
        throw new Error(`Schedule job at index ${index} missing cron/chatId`);
      }
      return {
        name: String(job.name || `job-${index + 1}`),
        cron,
        chatId,
        prompt,
      };
    });
  }

  const cron = (process.env.SCHEDULE_CRON || "").trim();
  const chatId = (process.env.SCHEDULE_TARGET_CHAT_ID || "").trim();
  if (!cron || !chatId) {
    return [];
  }
  return [
    {
      name: "default",
      cron,
      chatId,
      prompt: (process.env.SCHEDULE_PROMPT || "Daily check-in").trim() || "Daily check-in",
    },
  ];
}

function loadConfig() {
  const port = parseNumber("PORT", DEFAULT_PORT);
  const llmBaseUrl = optional("LLM_BASE_URL", DEFAULT_LLM_BASE_URL).replace(/\/+$/, "");
  const llmModel = optional("LLM_MODEL", DEFAULT_LLM_MODEL);
  const systemPrompt = optional("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT);
  const timeoutMs = parseNumber("LLM_TIMEOUT_MS", 90_000);

  return {
    port,
    feishu: {
      appId: required("FEISHU_APP_ID"),
      appSecret: required("FEISHU_APP_SECRET"),
      verifyToken: optional("FEISHU_VERIFY_TOKEN"),
      connectionMode: parseConnectionMode(),
    },
    llm: {
      apiKey: required("LLM_API_KEY"),
      baseUrl: llmBaseUrl,
      model: llmModel,
      systemPrompt,
      timeoutMs,
    },
    runtime: {
      historyTurns: parseNumber("HISTORY_TURNS", 6),
      logBody: parseBool("LOG_BODY", false),
    },
    schedules: parseScheduleJobs(),
  };
}

module.exports = {
  loadConfig,
};
