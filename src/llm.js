function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("LLM request timeout")), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function chatCompletion(params) {
  const timeout = withTimeout(params.timeoutMs || 90_000);
  try {
    const response = await fetch(`${params.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      signal: timeout.signal,
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: 0.4,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`LLM HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content.trim() || "(empty response)";
    }
    if (Array.isArray(content)) {
      const text = content
        .map((item) => (item && typeof item.text === "string" ? item.text : ""))
        .join("\n")
        .trim();
      return text || "(empty response)";
    }
    return "(empty response)";
  } finally {
    timeout.clear();
  }
}

module.exports = {
  chatCompletion,
};
