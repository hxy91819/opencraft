import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { IDBFactory } from "fake-indexeddb";
import { IndexedDbIdentityError, migrateIndexedDbIdentity } from "@opencraft/indexeddb-storage";
import { IndexedDbHostConnectionProfileStore } from "../../apps/workbench-web/src/runtime/indexeddb-host-profile-store";
import { IndexedDbSidebarLayoutStorage } from "../../apps/workbench-web/src/runtime/indexeddb-sidebar-layout-storage";
import { openIndexedDbExtensionPersistence } from "../../apps/workbench-web/src/runtime/indexeddb-extension-persistence";
import { IndexedDbReplicaClientStorage } from "@opencraft/appserver-replica-storage-web";
import type { HostConnectionProfile } from "@opencraft/workbench-runtime";
import type { ReplicaClientState } from "@opencraft/appserver-replica";

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onabort = transaction.onerror = () => reject(transaction.error); });
}
async function seed(factory: IDBFactory, name: string) {
  const request = factory.open(name, 1);
  request.onupgradeneeded = () => {
    const store = request.result.createObjectStore("rows", { keyPath: "id" });
    store.createIndex("by-owner", "owner", { unique: false });
    store.put({ id: "one", owner: "account/opaque", value: "remembered" });
    request.result.createObjectStore("out-of-line").put({ opaque: true }, ["server", 1]);
  };
  const db = await result(request); db.close();
}
const migration = (factory: IDBFactory) => ({ factory, name: "opencraft-owned", formerName: "vela-owned", formerWriterVersion: 1 });

test("known database migration preserves inline/out-of-line keys, indexes and historical records", async () => {
  const factory = new IDBFactory(); await seed(factory, "vela-owned");
  await migrateIndexedDbIdentity(migration(factory));
  const current = await result(factory.open("opencraft-owned", 1));
  try {
    assert.deepEqual(await result(current.transaction("rows").objectStore("rows").index("by-owner").get("account/opaque")), { id: "one", owner: "account/opaque", value: "remembered" });
    assert.deepEqual(await result(current.transaction("out-of-line").objectStore("out-of-line").get(["server", 1])), { opaque: true });
    assert.equal(current.objectStoreNames.contains("__opencraft_identity_handoff"), false);
    const tx = current.transaction("rows", "readwrite"), done = complete(tx); tx.objectStore("rows").clear(); await done;
  } finally { current.close(); }
  await assert.rejects(result(factory.open("vela-owned", 1)), error => error instanceof DOMException && error.name === "VersionError");
  const source = await result(factory.open("vela-owned"));
  try { assert.equal((await result(source.transaction("rows").objectStore("rows").get("one"))).value, "remembered"); }
  finally { source.close(); }
  await migrateIndexedDbIdentity(migration(factory));
  const reopened = await result(factory.open("opencraft-owned"));
  try { assert.equal(await result(reopened.transaction("rows").objectStore("rows").count()), 0, "cleared current data must not reimport history"); }
  finally { reopened.close(); }
});

test("missing sources are never created and existing current data remains authoritative", async () => {
  const factory = new IDBFactory(); await migrateIndexedDbIdentity(migration(factory));
  assert.deepEqual(await factory.databases(), []);
  await seed(factory, "opencraft-owned"); await seed(factory, "vela-owned");
  await migrateIndexedDbIdentity(migration(factory));
  const old = await result(factory.open("vela-owned", 1)); old.close();
});

test("an old window blocking handoff fails before destination creation; late upgrade is cancelled and retry preserves data", async () => {
  const factory = new IDBFactory(); await seed(factory, "vela-owned");
  const old = await result(factory.open("vela-owned", 1));
  await assert.rejects(migrateIndexedDbIdentity(migration(factory)), error => error instanceof IndexedDbIdentityError && error.reason === "blocked");
  assert.equal((await factory.databases()).some(db => db.name === "opencraft-owned"), false);
  old.close(); await setImmediate(); await setImmediate();
  const unchanged = await result(factory.open("vela-owned", 1)); unchanged.close();
  await migrateIndexedDbIdentity(migration(factory));
  assert.equal((await factory.databases()).some(db => db.name === "opencraft-owned"), true);
});

test("failed destination creation rolls back all copied stores and retries from the sealed source", async () => {
  const factory = new IDBFactory(); await seed(factory, "vela-owned");
  const failingFactory = { open(name: string, version?: number) {
    const request = factory.open(name, version);
    if (name === "opencraft-owned" && version !== undefined) request.addEventListener("upgradeneeded", () => request.transaction?.abort());
    return request;
  } } as IDBFactory;
  await assert.rejects(migrateIndexedDbIdentity(migration(failingFactory)));
  assert.equal((await factory.databases()).some(db => db.name === "opencraft-owned"), false);
  await migrateIndexedDbIdentity(migration(factory));
  const current = await result(factory.open("opencraft-owned"));
  try { assert.equal(await result(current.transaction("rows").objectStore("rows").count()), 1); }
  finally { current.close(); }
});

test("concurrent migration callers produce one destination without duplicate records", async () => {
  const factory = new IDBFactory(); await seed(factory, "vela-owned");
  await Promise.all([migrateIndexedDbIdentity(migration(factory)), migrateIndexedDbIdentity(migration(factory))]);
  const current = await result(factory.open("opencraft-owned"));
  try { assert.equal(await result(current.transaction("rows").objectStore("rows").count()), 1); }
  finally { current.close(); }
});

test("Host profiles retain recipes, machine identity, revisions and deletion after namespace migration", async () => {
  const factory = new IDBFactory();
  const profile: HostConnectionProfile = { hostId: "opaque-host", displayName: "Saved", providerId: "fixture.provider", providerConfig: { url: "wss://saved.example/" }, providerConfigVersion: 2, hostKind: "durable", enabled: true, autoConnect: false, includeInSidebar: true, credentialRef: "opaque-ref", transportEndpoint: null, executionLocation: null, workspaceBrowseRoots: ["/workspace"], revision: 7, machineIdentity: null, agent: null };
  let store = await IndexedDbHostConnectionProfileStore.open({ databaseName: "server:one:vela-host-connections", factory });
  await store.put(profile); store.close();
  const options = { databaseName: "server:one:opencraft-host-connections", formerDatabaseName: "server:one:vela-host-connections", factory };
  store = await IndexedDbHostConnectionProfileStore.open(options);
  assert.deepEqual(store.getSnapshot().profiles, [profile]);
  await store.remove(profile.hostId); store.close();
  store = await IndexedDbHostConnectionProfileStore.open(options);
  assert.deepEqual(store.getSnapshot().profiles, []); store.close();
  const other = await IndexedDbHostConnectionProfileStore.open({ databaseName: "server:two:opencraft-host-connections", formerDatabaseName: "server:two:vela-host-connections", factory });
  assert.deepEqual(other.getSnapshot().profiles, []); other.close();
});

test("extension documents retain CAS/tombstone revisions and current writes do not alter the former source", async () => {
  const factory = new IDBFactory(); const key = "plugin/fixture.extension/settings";
  const old = await openIndexedDbExtensionPersistence("vela-extension-data", factory);
  await old.compareAndSet(key, 0, 1, { nested: { enabled: false } }); await old.close();
  let current = await openIndexedDbExtensionPersistence("opencraft-extension-data", factory, "vela-extension-data");
  assert.equal((await current.read(key))?.revision, 1);
  assert.equal((await current.compareAndSet(key, 0, 1, { stale: true })).updated, false);
  await current.compareAndSet(key, 1, 1, {}); await current.close();
  current = await openIndexedDbExtensionPersistence("opencraft-extension-data", factory, "vela-extension-data");
  assert.deepEqual(await current.read(key), { revision: 2, version: 1, value: {} }); await current.close();
});

test("sidebar layout ownership and intentional unpinning survive migration and reopen", async () => {
  const factory = new IDBFactory(); const document = { schemaVersion: 1 as const, pinnedEntityKeys: ["host/opaque"], ownership: "user" as const };
  let store = await IndexedDbSidebarLayoutStorage.open({ databaseName: "vela-sidebar-layout", factory });
  await store.save("account:one", document); store.close();
  store = await IndexedDbSidebarLayoutStorage.open({ factory });
  assert.deepEqual(await store.load("account:one"), document);
  await store.save("account:one", { ...document, pinnedEntityKeys: [] }); store.close();
  store = await IndexedDbSidebarLayoutStorage.open({ factory });
  assert.deepEqual((await store.load("account:one"))?.pinnedEntityKeys, []); store.close();
});

test("default and Expo Web Replica caches preserve exact cursors and clear without reimport", async () => {
  for (const [former, current] of [["vela-appserver-replica", "opencraft-appserver-replica"], ["vela-workbench-replica", "opencraft-workbench-replica"]]) {
    const factory = new IDBFactory();
    const state: ReplicaClientState = { schemaVersion: 1, storageKey: "account:one:host:threads", scope: "threads", epoch: "opaque-epoch", nextSeq: 17, journalStartSeq: 8, entities: [{ entityId: "thread-a", value: { title: "Offline title" } }] };
    const old = new IndexedDbReplicaClientStorage({ databaseName: former, factory }); await old.commitClient(state); old.close();
    const config = current === "opencraft-appserver-replica" ? { factory } : { factory, databaseName: current, formerDatabaseName: former };
    let store = new IndexedDbReplicaClientStorage(config);
    assert.deepEqual(await store.loadClient(state.storageKey), state);
    assert.equal(await store.loadClient("account:two:host:threads"), null);
    await store.clearClient(state.storageKey); store.close();
    store = new IndexedDbReplicaClientStorage(config); assert.equal(await store.loadClient(state.storageKey), null); store.close();
  }
});
