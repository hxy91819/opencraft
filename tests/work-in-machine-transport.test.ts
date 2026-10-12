import assert from "node:assert/strict";
import test from "node:test";
import { MessageChannel } from "node:worker_threads";
import { AppHostServer } from "@opencraft/app-host-server";
import { MessagePortAppHostClient } from "@opencraft/app-host-client";
import { JsonRpcAppServerClient } from "@opencraft/appserver-client";
import { LOGICAL_CLIENT_FIELD } from "@opencraft/app-host-protocol";
import type { DuplexTransport, TransportStatus } from "@opencraft/appserver-client/transport";
import { MachineIdentityTransport } from "../apps/opencraft-daemon/src/machine-transport";
const machine = { machineId: "12345678-1234-4123-8123-123456789abc", name: "machine", platform: "linux" as const };

test("failed deferred engine initialization releases its App Host claim; a fresh lease retries", async () => {
  const channel = new MessageChannel();
  let starts = 0, closes = 0;
  const server = new AppHostServer({ logicalClientRouting: true, createTransport: () => new MachineIdentityTransport(machine, "Codex", () => {
    const attempt = ++starts; let status: TransportStatus = { state: "idle" };
    const messages = new Set<(frame: string) => void>(), statuses = new Set<(status: TransportStatus) => void>();
    const publish = (next: TransportStatus) => { status = next; for (const listener of statuses) listener(next); };
    const inner: DuplexTransport = { get status() { return status; }, async connect() { if (attempt === 1) throw new Error("account store failed before opening"); publish({ state: "open" }); },
      async send(frame) { const message = JSON.parse(frame); if (message.method === "initialize") for (const listener of messages) listener(JSON.stringify({ id: message.id, result: { userAgent: "fixture" }, [LOGICAL_CLIENT_FIELD]: message[LOGICAL_CLIENT_FIELD] })); },
      subscribeMessage(listener) { messages.add(listener); return () => { messages.delete(listener); }; },
      subscribeStatus(listener) { statuses.add(listener); return () => { statuses.delete(listener); }; },
      async close() { closes++; publish({ state: "closed" }); } };
    return inner;
  }) });
  server.accept({ postMessage: message => channel.port1.postMessage(message), subscribe(listener) { channel.port1.on("message", listener); return () => { channel.port1.off("message", listener); }; }, start() { channel.port1.start(); }, close() { channel.port1.close(); } }, "retry-test");
  const app = new MessagePortAppHostClient(channel.port2 as any, "retry-test");
  await app.waitUntilReady();
  try {
    const failed = new JsonRpcAppServerClient({ hostId: "local-codex", transport: app.createTransport("local-codex"), requestTimeoutMs: 1000 });
    await assert.rejects(failed.connect({ clientInfo: { name: "test", version: "1" } }));
    await failed.close();
    const retry = new JsonRpcAppServerClient({ hostId: "local-codex", transport: app.createTransport("local-codex"), requestTimeoutMs: 1000 });
    assert.equal((await retry.connect({ clientInfo: { name: "test", version: "1" } })).userAgent, "fixture");
    assert.equal(starts, 2);
    assert.equal(closes, 1);
    await retry.close();
    assert.equal(closes, 2);
  } finally { app.close(); await server.close(); channel.port1.close(); channel.port2.close(); }
});
