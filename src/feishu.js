const DEFAULT_FEISHU_BASE = "https://open.feishu.cn";

class FeishuClient {
  constructor(params) {
    this.appId = params.appId;
    this.appSecret = params.appSecret;
    this.baseUrl = (params.baseUrl || DEFAULT_FEISHU_BASE).replace(/\/+$/, "");
    this.cachedToken = "";
    this.tokenExpiresAt = 0;
  }

  async getTenantAccessToken() {
    const now = Date.now();
    if (this.cachedToken && now + 60_000 < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const response = await fetch(`${this.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.code !== 0 || !data.tenant_access_token) {
      throw new Error(`Feishu token failed: HTTP ${response.status}, body=${JSON.stringify(data)}`);
    }

    this.cachedToken = data.tenant_access_token;
    const expiresIn = Number(data.expire || 7200);
    this.tokenExpiresAt = now + Math.max(60, expiresIn - 60) * 1000;
    return this.cachedToken;
  }

  async sendTextMessage(params) {
    const token = await this.getTenantAccessToken();
    const receiveIdType = params.receiveIdType || "chat_id";
    const url = `${this.baseUrl}/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(receiveIdType)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: params.receiveId,
        msg_type: "text",
        content: JSON.stringify({ text: params.text }),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.code !== 0) {
      throw new Error(`Feishu send failed: HTTP ${response.status}, body=${JSON.stringify(data)}`);
    }
    return data;
  }
}

module.exports = {
  FeishuClient,
};
