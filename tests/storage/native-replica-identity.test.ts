import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync, backup } from "node:sqlite";
import { mkdtemp, readFile, writeFile, link, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createReplicaDatabaseIdentityMigration } from "../../packages/appserver-replica-storage-expo/src/database-identity";

const current = "opencraft-appserver-replica.db", former = "vela-appserver-replica.db";
function snapshot() { const bytes = new Uint8Array(100); [..."SQLite format 3\0"].forEach((character, index) => { bytes[index] = character.charCodeAt(0); }); return bytes; }

test("native identity migration probes only exact owned names, never imports into current state", async () => {
  const calls: string[] = [];
  const prepare = createReplicaDatabaseIdentityMigration({ exists(name) { calls.push(name); return name === current; }, async snapshot() { throw new Error("unexpected read"); }, async install() { throw new Error("unexpected write"); } });
  await prepare(current); assert.deepEqual(calls, [current]);
  calls.length = 0;
  for (const name of ["custom.db", "other-opencraft-appserver-replica.db", former]) await prepare(name);
  assert.deepEqual(calls, []);
});

test("missing history leaves fresh creation to the normal database owner", async () => {
  let installed = false;
  const prepare = createReplicaDatabaseIdentityMigration({ exists: () => false, async snapshot() { throw new Error("missing source must not be opened"); }, async install() { installed = true; } });
  await prepare(current); assert.equal(installed, false);
});

test("concurrent native clients share one snapshot/install and preserve the source", async () => {
  const files = new Map([[former, snapshot()]]); let reads = 0, writes = 0;
  const prepare = createReplicaDatabaseIdentityMigration({ exists: name => files.has(name), async snapshot(name) { reads++; await Promise.resolve(); return files.get(name)!; }, async install(name, bytes) { writes++; files.set(name, bytes); } });
  await Promise.all([prepare(current), prepare(current), prepare(current)]);
  assert.equal(reads, 1); assert.equal(writes, 1); assert.equal(files.has(former), true);
  await prepare(current); assert.equal(reads, 1);
});

test("snapshot/copy failures retain history and release the gate for a real retry", async () => {
  for (const failure of ["snapshot", "install"]) {
    const files = new Map([[former, snapshot()]]); let fail = true;
    const prepare = createReplicaDatabaseIdentityMigration({ exists: name => files.has(name), async snapshot(name) { if (fail && failure === "snapshot") throw new Error("snapshot failed"); return files.get(name)!; }, async install(name, bytes) { if (fail && failure === "install") throw new Error("install failed"); files.set(name, bytes); } });
    await assert.rejects(prepare(current), /failed/); assert.equal(files.has(former), true); assert.equal(files.has(current), false);
    fail = false; await prepare(current); assert.equal(files.has(current), true);
  }
});

test("invalid or truncated snapshots cannot create a current database", async () => {
  for (const bytes of [new Uint8Array(), snapshot().slice(0, 99), new Uint8Array(100)]) {
    let installed = false;
    const prepare = createReplicaDatabaseIdentityMigration({ exists: name => name === former, snapshot: async () => bytes, async install() { installed = true; } });
    await assert.rejects(prepare(current), /Invalid Replica/); assert.equal(installed, false);
  }
});

test("a complete destination winning the installation race remains authoritative", async () => {
  const files = new Map([[former, snapshot()]]); const winner = snapshot(); winner[99] = 7;
  const prepare = createReplicaDatabaseIdentityMigration({ exists: name => files.has(name), snapshot: async () => files.get(former)!, async install(name) { files.set(name, winner); throw new Error("destination exists"); } });
  await prepare(current); assert.equal(files.get(current), winner); assert.equal(files.has(former), true);
});

test("SQLite snapshots include committed WAL rows, retain exact cursors and never revive cleared current caches", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencraft-native-replica-identity-"));
  let source: DatabaseSync | undefined, destination: DatabaseSync | undefined;
  try {
    const old = "vela-workbench-replica.db", name = "opencraft-workbench-replica.db";
    source = new DatabaseSync(join(directory, old));
    source.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE replica_clients(storage_key TEXT PRIMARY KEY NOT NULL, schema_version INTEGER NOT NULL, payload TEXT NOT NULL)");
    const state = { storageKey: "account:one:host:threads", schemaVersion: 1, scope: "threads", epoch: "opaque-epoch", nextSeq: 17, journalStartSeq: 4, entities: [{ entityId: "thread", value: { title: "Offline title" } }] };
    source.prepare("INSERT INTO replica_clients VALUES(?,?,?)").run(state.storageKey, 1, JSON.stringify(state));
    await access(join(directory, old + "-wal"));
    const prepare = createReplicaDatabaseIdentityMigration({
      async exists(file) { try { await access(join(directory, file)); return true; } catch { return false; } },
      async snapshot() {
        // A real SQLite backup models the native serializeAsync boundary, not
        // the Expo SDK or an installed Android/iOS process.
        const path = join(directory, "consistent-snapshot.db"); await backup(source!, path); return readFile(path);
      },
      async install(file, bytes) {
        const temporary = join(directory, "migration.tmp"); await writeFile(temporary, bytes, { flag: "wx" });
        try { await link(temporary, join(directory, file)); } finally { await rm(temporary); }
      },
    });
    await prepare(name);
    destination = new DatabaseSync(join(directory, name));
    assert.deepEqual(JSON.parse((destination.prepare("SELECT payload FROM replica_clients WHERE storage_key=?").get(state.storageKey) as { payload: string }).payload), state);
    assert.equal(destination.prepare("SELECT payload FROM replica_clients WHERE storage_key=?").get("account:two:host:threads"), undefined);
    destination.exec("DELETE FROM replica_clients"); destination.close(); destination = undefined;
    await prepare(name); destination = new DatabaseSync(join(directory, name));
    assert.equal(destination.prepare("SELECT count(*) AS n FROM replica_clients").get()!.n, 0);
    assert.equal(source.prepare("SELECT count(*) AS n FROM replica_clients").get()!.n, 1);
  } finally { destination?.close(); source?.close(); await rm(directory, { recursive: true, force: true }); }
});
