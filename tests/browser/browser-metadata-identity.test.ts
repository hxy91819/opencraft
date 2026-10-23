import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { WebSocketServer } from "ws";
import { browserMetadataKeys as keys, normalizeBrowserMetadata, readBrowserMetadataValue } from "@opencraft/workbench-runtime/browser-metadata-identity";
import { WebBrowserPageRuntime } from "../../apps/workbench-web/src/browser/web-browser-runtime";

test("desktop metadata normalizes exact former keys, preserves current intent and filters unknown identities", () => {
  assert.deepEqual(normalizeBrowserMetadata({
    "vela.browser-pages.v1": "old-pages", [keys.pages]: "[]",
    "vela.browser-tabs.v1": "old-tabs", "vela.conversation-bindings.v1": "old-bindings",
    [keys.storage]: "storage", [keys.retiredStorage]: "retired",
    "third-party.browser-pages.v1": "foreign", "vela.browser-pages.v2": "unknown",
  }), { [keys.pages]: "[]", [keys.tabs]: "old-tabs", [keys.bindings]: "old-bindings", [keys.storage]: "storage", [keys.retiredStorage]: "retired" });
  assert.deepEqual(normalizeBrowserMetadata({ [keys.pages]: null, "vela.browser-pages.v1": "old-pages" }), {});
});

test("page restoration keeps opaque ownership and current empty metadata prevents old page revival", () => {
  const stored = [{ id: "stable-page", ownerId: "scope/opaque", hostId: "host:opaque", createdAt: 1, entries: [{ url: "https://page.example/", title: "Saved page" }], index: 0 }];
  const records = new Map([["vela.browser-pages.v1", JSON.stringify(stored)]]);
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  const runtime = new WebBrowserPageRuntime(undefined, null, undefined, storage);
  try {
    const page = runtime.listForOwner("scope/opaque")[0]!;
    assert.equal(page.id, "stable-page"); assert.equal(page.navigation.currentUrl, "https://page.example/");
    assert.equal(records.get(keys.pages), JSON.stringify(stored));
    runtime.close(page.id);
    assert.equal(records.get(keys.pages), "[]");
  } finally { runtime.dispose(); }
  const restored = new WebBrowserPageRuntime(undefined, null, undefined, storage);
  try { assert.equal(restored.listForOwner("scope/opaque").length, 0); }
  finally { restored.dispose(); }
});

test("failed copy-forward preserves historical source and partition-specific reads cannot inherit another server", () => {
  const records = new Map([["server:one:vela.conversation-bindings.v1", "bindings-one"], ["server:two:vela.conversation-bindings.v1", "bindings-two"]]);
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem() { throw new Error("quota"); } };
  assert.equal(readBrowserMetadataValue(storage, keys.bindings, key => `server:one:${key}`), "bindings-one");
  assert.equal(readBrowserMetadataValue(storage, keys.bindings, key => `server:three:${key}`), null);
  assert.equal(records.size, 2);
});

test("remote storage promotes exact old local metadata through real RPC, retaining the stable surface API", async () => {
  const previous = new Map(["document", "location", "localStorage"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const records = new Map([
    ["vela.browser-pages.v1", "old-pages"], [keys.tabs, "[]"], ["vela.browser-tabs.v1", "stale-tabs"],
    ["server:one:vela.conversation-bindings.v1", "bindings-one"], ["server:two:vela.conversation-bindings.v1", "bindings-two"],
    ["server:one:opencraft.remote-browser-storage.v1", "remote-storage"],
  ]);
  Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: () => ({ textContent: JSON.stringify({ id: "one", name: "One", basePath: "/servers/one", selectorPath: "/servers" }) }) } });
  Object.defineProperty(globalThis, "location", { configurable: true, value: { href: `http://127.0.0.1:${(server.address() as { port: number }).port}/servers/one/` } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } } });
  const values: Record<string, string> = {}, revisions: Record<string, number> = {};
  let revision = 0; const writes: string[] = [];
  server.on("connection", (socket, request) => {
    assert.equal(request.url, "/servers/one/__opencraft_browser/stream");
    socket.on("message", data => {
      const message = JSON.parse(String(data));
      const input = message.input;
      if (input) {
        assert.equal(input.expectedRevision, revision);
        assert.equal(input.expectedKeyRevision, revisions[input.key] ?? 0);
        assert.equal(input.scope, "account-one");
        values[input.key] = input.value; revisions[input.key] = ++revision; writes.push(input.key);
        socket.send(JSON.stringify({ id: message.id, type: "result", value: { revision, keyRevision: revision } }));
      } else socket.send(JSON.stringify({ id: message.id, type: "result", value: { values, revision, keyRevisions: revisions, scope: "account-one" } }));
    });
  });
  const { RemoteBrowserStorage } = await import("../../apps/workbench-web/src/browser/remote-browser-storage");
  let storage: Awaited<ReturnType<typeof RemoteBrowserStorage.create>> | undefined;
  try {
    storage = await RemoteBrowserStorage.create();
    assert.deepEqual(values, { pages: "old-pages", tabs: "[]", storage: "remote-storage", bindings: "bindings-one" });
    assert.equal(storage.getItem("opencraft.remote-browser-storage.v1"), "remote-storage");
    assert.equal(storage.getItem(`server:one:${keys.bindings}`), "bindings-one");
    assert.equal(storage.getItem(keys.bindings), null);
    assert.throws(() => storage!.setItem("vela.browser-pages.v1", "[]"), /Unknown/);
    storage.dispose(); storage = undefined;
    records.set(keys.pages, "stale-local-pages");
    const count = writes.length;
    storage = await RemoteBrowserStorage.create();
    assert.equal(storage.getItem(keys.pages), "old-pages");
    assert.equal(writes.length, count, "existing server state must not replay local promotion");
  } finally {
    storage?.dispose(); for (const socket of server.clients) socket.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  }
});
