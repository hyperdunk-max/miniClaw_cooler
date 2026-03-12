const Lark = require("@larksuiteoapi/node-sdk");

function startFeishuWebSocket(params) {
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

  const wsClient = new Lark.ws.Client({
    appId: params.appId,
    appSecret: params.appSecret,
    eventDispatcher: dispatcher,
    loggerLevel: Lark.LoggerLevel.warn,
  });

  wsClient.start({
    autoReconnect: true,
    onOpen: () => {
      console.log("[feishu-ws] connected");
    },
    onClose: () => {
      console.warn("[feishu-ws] disconnected");
    },
    onError: (error) => {
      console.error(`[feishu-ws-error] ${String(error)}`);
    },
  });

  return wsClient;
}

module.exports = {
  startFeishuWebSocket,
};
