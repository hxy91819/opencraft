import assert from "node:assert/strict";
import test from "node:test";

import { JsonRpcAppServerClient } from "@opencraft/appserver-client";
import {
  encodeJsonRpcMessage,
  isJsonRpcRequest,
  parseJsonRpcMessage,
  type AppServerInitializeResponse,
} from "@opencraft/appserver-protocol";
import {
  MemoryTransport,
  type InMemoryAppServer,
  type InMemoryAppServerPeer,
} from "@opencraft/appserver-transport-memory";
import { AppServerTerminalController } from "@opencraft/workbench-runtime";

const initializeResponse: AppServerInitializeResponse = {
  codexHome: "/tmp/codex-home",
  platformFamily: "unix",
  platformOs: "linux",
  userAgent: "opencraft-terminal-test/1",
};

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test("AppServer terminal owns a real streaming PTY lifecycle", async () => {
  let execRequestId: string | number | null = null;
  const received: Array<{ readonly method: string; readonly params: unknown }> = [];
  const server: InMemoryAppServer = {
    receive(frame, peer) {
      const message = parseJsonRpcMessage(frame);
      if (!isJsonRpcRequest(message)) return;
      received.push({ method: message.method, params: message.params });
      if (message.method === "initialize") {
        peer.send(encodeJsonRpcMessage({ id: message.id, result: initializeResponse }));
        return;
      }
      if (message.method === "command/exec") {
        execRequestId = message.id;
        return;
      }
      if (message.method === "command/exec/resize") {
        peer.send(encodeJsonRpcMessage({ id: message.id, result: {} }));
        return;
      }
      if (message.method === "command/exec/write") {
        const processId = (message.params as { processId: string }).processId;
        peer.send(encodeJsonRpcMessage({
          method: "command/exec/outputDelta",
          params: {
            processId,
            stream: "stdout",
            deltaBase64: "aGVsbG8NCg==",
            capReached: false,
          },
        }));
        peer.send(encodeJsonRpcMessage({ id: message.id, result: {} }));
        peer.send(encodeJsonRpcMessage({
          id: execRequestId,
          result: { exitCode: 0, stdout: "", stderr: "" },
        }));
        return;
      }
      if (message.method === "command/exec/terminate") {
        peer.send(encodeJsonRpcMessage({ id: message.id, result: {} }));
      }
    },
  };
  const client = new JsonRpcAppServerClient({
    hostId: "terminal-host",
    transport: new MemoryTransport(server),
  });
  await client.connect({
    clientInfo: { name: "terminal-test", version: "1" },
    capabilities: { experimentalApi: true },
  });
  const controller = new AppServerTerminalController("terminal-host", client);
  const session = controller.open({
    command: ["/bin/bash", "--noprofile", "--norc"],
    cwd: "/workspace/project",
    cols: 80,
    rows: 24,
  });

  const exec = received.find((request) => request.method === "command/exec");
  assert.deepEqual(exec?.params, {
    command: ["/bin/bash", "--noprofile", "--norc"],
    processId: session.processId,
    tty: true,
    streamStdin: true,
    streamStdoutStderr: true,
    disableOutputCap: true,
    disableTimeout: true,
    cwd: "/workspace/project",
    env: null,
    size: { cols: 80, rows: 24 },
    permissionProfile: null,
  });

  await session.resize(120, 40);
  await session.write("cHdkCg==");
  await nextTask();

  assert.equal(session.getSnapshot().phase, "exited");
  assert.equal(session.getSnapshot().exitCode, 0);
  assert.deepEqual(session.getSnapshot().output.map((chunk) => chunk.deltaBase64), [
    "aGVsbG8NCg==",
  ]);
  assert.deepEqual(
    received.filter((request) => request.method === "command/exec/resize")[0]?.params,
    { processId: session.processId, size: { cols: 120, rows: 40 } },
  );

  await session.dispose();
  await controller.dispose();
  await client.close();
});

test("a transport generation loss fences the old PTY", async () => {
  let peer: InMemoryAppServerPeer | null = null;
  const server: InMemoryAppServer = {
    connected(nextPeer) {
      peer = nextPeer;
    },
    receive(frame, currentPeer) {
      const message = parseJsonRpcMessage(frame);
      if (!isJsonRpcRequest(message)) return;
      if (message.method === "initialize") {
        currentPeer.send(encodeJsonRpcMessage({ id: message.id, result: initializeResponse }));
      }
    },
  };
  const client = new JsonRpcAppServerClient({
    hostId: "generation-host",
    transport: new MemoryTransport(server),
  });
  await client.connect({ clientInfo: { name: "terminal-test", version: "1" } });
  const controller = new AppServerTerminalController("generation-host", client);
  const session = controller.open({
    command: ["/bin/bash"],
    cols: 80,
    rows: 24,
  });

  (peer as InMemoryAppServerPeer | null)?.close("link lost");
  assert.equal(session.getSnapshot().phase, "disconnected");
  await assert.rejects(session.write("YQ=="), /closed AppServer connection/u);

  await session.dispose();
  await controller.dispose();
  await client.close();
});
