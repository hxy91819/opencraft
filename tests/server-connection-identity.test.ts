import assert from "node:assert/strict";
import test from "node:test";
import { IDBFactory } from "fake-indexeddb";
import { createWorkbenchDraftLocation, type HostConnectionProfile } from "@opencraft/workbench-runtime";
import { SERVER_CONNECTIONS_ID, migrateServerConnectionProfiles } from "@opencraft/plugin-builtin-agents/server-connection-identity";
import { IndexedDbHostConnectionProfileStore } from "../apps/workbench-web/src/runtime/indexeddb-host-profile-store";
import { createApplicationNavigation } from "../apps/workbench-web/src/runtime/workbench-navigation";
import { resolveServerConnectionRoute } from "../apps/workbench-web/src/runtime/server-connection-compatibility";

const legacyProfile: HostConnectionProfile = {
  hostId: "saved-server", displayName: "My server", providerId: "vela.headless-codex",
  providerConfig: {}, providerConfigVersion: 1, hostKind: "durable", enabled: false,
  autoConnect: false, includeInSidebar: true, credentialRef: "credential-reference",
  transportEndpoint: "Server", executionLocation: "Existing server", workspaceBrowseRoots: ["/saved"],
  revision: 7, machineIdentity: { machineId: "12345678-1234-4123-8123-123456789abc", name: "Machine", platform: "linux" }, agent: "OpenCraft",
};

test("saved server provider migrates once, preserving Host, recipe and machine observations across reopen", async () => {
  const factory = new IDBFactory();
  const unrelated = { ...legacyProfile, hostId: "third-party", providerId: "vela.headless-codex.custom" };
  const store = await IndexedDbHostConnectionProfileStore.open({ factory, seed: [legacyProfile, unrelated] });
  const before = store.getSnapshot().profiles.find(profile => profile.hostId === legacyProfile.hostId)!;
  try {
    await migrateServerConnectionProfiles(store);
    await migrateServerConnectionProfiles(store);
    assert.deepEqual(store.getSnapshot().profiles.find(profile => profile.hostId === before.hostId), {
      ...before, providerId: SERVER_CONNECTIONS_ID, revision: 8,
    });
    assert.equal(store.getSnapshot().profiles.find(profile => profile.hostId === unrelated.hostId)!.providerId, unrelated.providerId);
  } finally { store.close(); }
  const reopened = await IndexedDbHostConnectionProfileStore.open({ factory });
  try {
    assert.deepEqual(reopened.getSnapshot().profiles.find(profile => profile.hostId === before.hostId), {
      ...before, providerId: SERVER_CONNECTIONS_ID, revision: 8,
    });
  } finally { reopened.close(); }
});

test("failed provider rewrite rejects without pretending the profile migrated; retry is safe", async () => {
  const factory = new IDBFactory();
  const store = await IndexedDbHostConnectionProfileStore.open({ factory, seed: [legacyProfile] });
  const put = store.put.bind(store);
  store.put = async () => { throw new Error("storage unavailable"); };
  try {
    await assert.rejects(migrateServerConnectionProfiles(store), /storage unavailable/);
    assert.equal(store.getSnapshot().profiles[0]!.providerId, legacyProfile.providerId);
    store.put = put;
    await migrateServerConnectionProfiles(store);
    assert.equal(store.getSnapshot().profiles[0]!.revision, 8);
  } finally { store.close(); }
});

const settle = () => new Promise<void>(resolve => setImmediate(resolve));
for (const hostless of [true, false]) test(`${hostless ? "hostless" : "connected"}: old settings and View bookmarks canonicalize via REPLACE on boot and POP`, async () => {
  const location = hostless ? null : createWorkbenchDraftLocation("explicit-server", "preserved-draft");
  const nav = createApplicationNavigation(location, { mode: "memory", initialEntries: [
    "/settings/vela.headless-codex.ssh", "/settings/vela.headless-codex.accounts",
  ], resolveApplicationRoute: resolveServerConnectionRoute });
  try {
    const scope = nav.getSnapshot().routeScopeId;
    assert.equal(nav.getSnapshot().url, "/settings/opencraft.server-connections.codex-accounts");
    assert.equal(nav.getSnapshot().action, "replace");
    assert.equal(nav.getSnapshot().historyIndex, 1);
    assert.deepEqual(nav.getSnapshot().location, location);
    nav.back(); await settle();
    assert.equal(nav.getSnapshot().url, "/settings/opencraft.server-connections.ssh");
    assert.equal(nav.getSnapshot().historyIndex, 0);
    nav.forward(); await settle();
    assert.equal(nav.getSnapshot().url, "/settings/opencraft.server-connections.codex-accounts");
    assert.equal(nav.getSnapshot().routeScopeId, scope);
    const index = nav.getSnapshot().historyIndex;
    nav.openSettings("vela.headless-codex.accounts");
    assert.equal(nav.getSnapshot().historyIndex, index, "equivalent old bookmark must not push a duplicate destination");
    nav.openExtensionView("vela.headless-codex.ssh-view", "opaque://keep/resource");
    assert.equal(nav.getSnapshot().applicationRoute.kind, "extension-view");
    assert.deepEqual(nav.getSnapshot().applicationRoute, { kind: "extension-view", viewId: "opencraft.server-connections.ssh-view", resourceUri: "opaque://keep/resource" });
    nav.openSettings("third-party.headless-codex.ssh");
    assert.equal(nav.getSnapshot().url, "/settings/third-party.headless-codex.ssh");
    nav.openSettings("opencraft.builtin-agents.codex-accounts");
    assert.equal(nav.getSnapshot().url, "/settings/opencraft.builtin-agents.codex-accounts");
    nav.openSettings("vela.headless-codex.ssh");
    assert.equal(nav.getSnapshot().url, "/settings/opencraft.server-connections.ssh");
  } finally { nav.dispose(); }
});

test("generic Router does not reinterpret a plugin ID without the composition resolver", () => {
  const nav = createApplicationNavigation(null, { mode: "memory", initialEntries: ["/settings/vela.headless-codex.ssh"] });
  try { assert.equal(nav.getSnapshot().url, "/settings/vela.headless-codex.ssh"); }
  finally { nav.dispose(); }
});
