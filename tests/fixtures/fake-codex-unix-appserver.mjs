import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const endpoint = process.argv[2];
const server = createServer();
const sockets = new WebSocketServer({ server });
const subscriptions = new Map();
const threads = new Map();
let sequence = 0;
sockets.on("connection", socket => {
  const subscribed = new Set();
  subscriptions.set(socket, subscribed);
  socket.on("close", () => subscriptions.delete(socket));
  const send = value => socket.send(JSON.stringify(value));
  socket.on("message", raw => {
    const { id, method, params = {} } = JSON.parse(String(raw));
    if (method === "initialized") return;
    if (method === "initialize") { send({ id, result: { serverInfo: { name: "fake", version: "1" } } }); return; }
    if (method === "thread/start") {
      const thread = { id: `thread-${++sequence}`, turns: [] };
      threads.set(thread.id, thread); subscribed.add(thread.id);
      send({ id, result: { thread } }); return;
    }
    if (method === "thread/resume") {
      if (params.fixtureReject) {
        setTimeout(() => send({ id, error: { code: -1, message: "Resume rejected" } }), 100); return;
      }
      if (!threads.has(params.threadId)) { send({ id, error: { code: -1, message: "Missing thread" } }); return; }
      subscribed.add(params.threadId);
      const reply = () => send({ id, result: { thread: threads.get(params.threadId) } });
      if (params.fixtureDelay) setTimeout(reply, 100); else reply();
      return;
    }
    if (method === "thread/unsubscribe") {
      send({ id, result: { status: subscribed.delete(params.threadId) ? "unsubscribed" : "notSubscribed" } }); return;
    }
    if (method === "fixture/publish") {
      for (const [client, ids] of subscriptions) if (ids.has(params.threadId)) {
        client.send(JSON.stringify({ method: "item/agentMessage/delta", params: { threadId: params.threadId, delta: params.delta } }));
      }
      send({ id, result: {} }); return;
    }
    if (method === "fixture/subscribers") {
      send({ id, result: { count: [...subscriptions.values()].filter(ids => ids.has(params.threadId)).length } }); return;
    }
    send({ id, result: {} });
  });
});
server.listen(endpoint);
