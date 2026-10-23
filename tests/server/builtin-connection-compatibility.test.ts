import assert from "node:assert/strict";
import test from "node:test";
import { IDBFactory } from "fake-indexeddb";
import { createWorkbenchDraftLocation, type HostConnectionProfile } from "@opencraft/workbench-runtime";
import { IndexedDbHostConnectionProfileStore } from "../../apps/workbench-web/src/runtime/indexeddb-host-profile-store";
import { migrateBuiltinConnectionProfiles, resolveBuiltinConnectionRoute } from "../../apps/workbench-web/src/runtime/builtin-connection-compatibility";
import { createApplicationNavigation } from "../../apps/workbench-web/src/runtime/workbench-navigation";

const profile = (hostId: string, providerId: string): HostConnectionProfile => ({
  hostId, displayName: "My connection", providerId, providerConfig: { url: "wss://fixture.example/appserver" },
  providerConfigVersion: 1, hostKind: "durable", enabled: false, autoConnect: false, includeInSidebar: true,
  credentialRef: "unchanged-reference", transportEndpoint: "Endpoint", executionLocation: "Elsewhere",
  workspaceBrowseRoots: ["/saved"], revision: 3, machineIdentity: null, agent: null,
});

test("provider migration preserves saved recipes across reopen, is idempotent and waits for available providers", async () => {
  const factory = new IDBFactory();
  const rows = [profile("socket", "vela.websocket"), profile("desktop", "vela.builtin-agents"),
    profile("remote", "vela.hypernode"), profile("custom", "vela.websocket.enterprise")];
  const store = await IndexedDbHostConnectionProfileStore.open({ factory, seed: rows });
  const before = store.getSnapshot().profiles;
  try {
    await migrateBuiltinConnectionProfiles(store, ["opencraft.websocket", "opencraft.builtin-agents"]);
    for (const original of before) {
      const providerId = original.hostId === "socket" ? "opencraft.websocket"
        : original.hostId === "desktop" ? "opencraft.builtin-agents" : original.providerId;
      assert.deepEqual(store.getSnapshot().profiles.find(row => row.hostId === original.hostId), {
        ...original, providerId, revision: providerId === original.providerId ? 3 : 4,
      });
    }
    const once = store.getSnapshot();
    await migrateBuiltinConnectionProfiles(store, ["opencraft.websocket", "opencraft.builtin-agents"]);
    assert.equal(store.getSnapshot(), once);
  } finally { store.close(); }
  const reopened = await IndexedDbHostConnectionProfileStore.open({ factory });
  try {
    await migrateBuiltinConnectionProfiles(reopened, ["opencraft.hypernode"]);
    assert.equal(reopened.getSnapshot().profiles.find(row => row.hostId === "remote")!.providerId, "opencraft.hypernode");
    assert.equal(reopened.getSnapshot().profiles.find(row => row.hostId === "remote")!.revision, 4);
    assert.equal(reopened.getSnapshot().profiles.find(row => row.hostId === "custom")!.providerId, rows[3]!.providerId);
  } finally { reopened.close(); }
});

test("an unavailable storage writer does not silently report a provider migration", async () => {
  const store = await IndexedDbHostConnectionProfileStore.open({ factory: new IDBFactory(), seed: [profile("socket", "vela.websocket")] });
  try {
    store.put = async () => { throw new Error("write unavailable"); };
    await assert.rejects(migrateBuiltinConnectionProfiles(store, ["opencraft.websocket"]), /write unavailable/);
    assert.equal(store.getSnapshot().profiles[0]!.providerId, "vela.websocket");
  } finally { store.close(); }
});

for (const hostless of [true, false]) test(`${hostless ? "hostless" : "connected"}: built-in bookmarks replace once and keep scope, resource and POP position`, async () => {
  const location = hostless ? null : createWorkbenchDraftLocation("fixture-host", "saved-draft");
  const nav = createApplicationNavigation(location, { mode: "memory", initialEntries: [
    "/settings/vela.voice-input.web-settings", "/views/vela.bot-chat.view?resource=opaque%3Asaved",
  ], resolveApplicationRoute: route => resolveBuiltinConnectionRoute(route, false) });
  try {
    const scope = nav.getSnapshot().routeScopeId;
    assert.deepEqual(nav.getSnapshot().applicationRoute, { kind: "extension-view", viewId: "opencraft.bot-chat.view", resourceUri: "opaque:saved" });
    assert.equal(nav.getSnapshot().action, "replace");
    assert.equal(nav.getSnapshot().historyIndex, 1);
    assert.deepEqual(nav.getSnapshot().location, location);
    nav.back(); await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(nav.getSnapshot().url, "/settings/opencraft.voice-input.web-settings");
    assert.equal(nav.getSnapshot().historyIndex, 0);
    nav.forward(); await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(nav.getSnapshot().routeScopeId, scope);
    nav.openSettings("vela.builtin-agents.codex-accounts");
    assert.equal(nav.getSnapshot().url, "/settings/opencraft.builtin-agents.codex-accounts");
    const opaque = { kind: "settings" as const, slug: "vela.voice-input.enterprise" };
    assert.equal(resolveBuiltinConnectionRoute(opaque, false), opaque);
  } finally { nav.dispose(); }
});
