const Lark = require("@larksuiteoapi/node-sdk");

function startFeishuWebSocket(params) {
  if (!Lark.WSClient) {
    throw new Error("Feishu SDK does not expose WSClient. Please check @larksuiteoapi/node-sdk version.");
  }

  const dispatcher = new Lark.EventDispatcher({
    verificationToken: params.verifyToken || "",
  }).register({
    "im.message.receive_v1": async (data) => {
      if (params.logBody) {
        console.log("[ws-event]", JSON.stringify(data));
      }
      setImmediate(() => {
        Promise.resolve(params.onMessage(data)).catch((err) => {
          console.error(`[ws-event-error] ${String(err)}`);
        });
      });
    },
  });

  const wsClient = new Lark.WSClient({
    appId: params.appId,
    appSecret: params.appSecret,
    autoReconnect: true,
    loggerLevel: Lark.LoggerLevel.warn,
  });

  wsClient
    .start({
      eventDispatcher: dispatcher,
    })
    .then(() => {
      console.log("[feishu-ws] connected");
    })
    .catch((error) => {
      console.error(`[feishu-ws-error] ${String(error)}`);
    });

  return wsClient;
}

module.exports = {
  startFeishuWebSocket,
};
