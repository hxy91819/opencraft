import assert from "node:assert/strict";
import test from "node:test";
import { legacySelectionPreferenceKey, readSelectionPreference, writeSelectionPreference } from "../../apps/workbench-web/src/runtime/selection-preferences";
import { restoreLegacyWebsiteSelection } from "../../apps/workbench-web/src/runtime/web-deployment-config";

const identity = (key: string) => key;
function memory(entries: [string, string][] = []) {
  const values = new Map(entries);
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
  };
  return { values, storage };
}

test("selection migration keeps canonical intent and moves only the requested old value", () => {
  const { values, storage } = memory([
    ["vela.active-host-id", "old-host"], ["opencraft.active-host-id", "current-host"],
    ["vela.active-thread-id:host-a", "thread-a"], ["vela.active-thread-id:host-b", "thread-b"],
  ]);
  assert.equal(readSelectionPreference(storage, "opencraft.active-host-id", identity), "current-host");
  assert.equal(readSelectionPreference(storage, "opencraft.active-thread-id:host-a", identity), "thread-a");
  assert.equal(values.get("opencraft.active-thread-id:host-a"), "thread-a");
  assert.equal(values.has("vela.active-thread-id:host-a"), false);
  assert.equal(values.get("vela.active-thread-id:host-b"), "thread-b");
  const snapshot = [...values];
  assert.equal(readSelectionPreference(storage, "opencraft.active-thread-id:host-a", identity), "thread-a");
  assert.deepEqual([...values], snapshot);
});

test("migration stays inside the requesting server, product, Host and account", () => {
  const scope = (key: string) => `server:one:product-a:${key}`;
  const current = scope("opencraft.active-thread-id:host:account:cn%3Aalice");
  const former = scope("vela.active-thread-id:host:account:cn%3Aalice");
  const { values, storage } = memory([
    [former, "alice-thread"],
    [scope("vela.active-thread-id:host:account:cn%3Abob"), "bob-thread"],
    ["server:two:product-a:vela.active-thread-id:host:account:cn%3Aalice", "other-server"],
    ["server:one:product-b:vela.active-thread-id:host:account:cn%3Aalice", "other-product"],
    ["vela.active-thread-id:host:account:cn%3Aalice", "unpartitioned"],
  ]);
  const untouched = [...values].filter(([key]) => key !== former);
  assert.equal(readSelectionPreference(storage, current, scope), "alice-thread");
  assert.equal(readSelectionPreference(storage, scope("opencraft.active-thread-id:host:account:cn%3Acarol"), scope), null);
  assert.deepEqual([...values].filter(([key]) => key !== current), untouched);
});

test("exact owned key families preserve opaque suffixes and reject lookalikes", () => {
  for (const suffix of ["active-host-id", "active-thread-id", "active-thread-id:host:opaque:account:a%2Fb", "selected-project-id:host/opaque"]) {
    assert.equal(legacySelectionPreferenceKey(`opencraft.${suffix}`, identity), `vela.${suffix}`);
  }
  for (const key of ["opencraft.active-host-id:other", "opencraft.active-thread-id:", "opencraft.selected-project-id", "opencraft.selected-project-id:", "foreign.opencraft.active-thread-id", "opencraft.active-thread-id-copy", "vela.active-host-id"]) {
    assert.equal(legacySelectionPreferenceKey(key, identity), null, key);
  }
});

test("clearing or replacing a selection retires its old alias without resurrecting it", () => {
  const current = "opencraft.active-thread-id:host";
  const former = "vela.active-thread-id:host";
  const { values, storage } = memory([[current, "new"], [former, "old"]]);
  writeSelectionPreference(storage, current, null, identity);
  assert.equal(readSelectionPreference(storage, current, identity), null);
  assert.equal(values.size, 0);
  values.set(former, "old");
  writeSelectionPreference(storage, current, "replacement", identity);
  assert.deepEqual([...values], [[current, "replacement"]]);
});

test("empty strings are persisted selections rather than missing keys", () => {
  const { values, storage } = memory([["vela.active-host-id", "old"], ["opencraft.active-host-id", ""]]);
  assert.equal(readSelectionPreference(storage, "opencraft.active-host-id", identity), "");
  values.delete("opencraft.active-host-id"); values.set("vela.active-host-id", "");
  assert.equal(readSelectionPreference(storage, "opencraft.active-host-id", identity), "");
  assert.equal(values.get("opencraft.active-host-id"), "");
});

test("read-only or unavailable persistence keeps old selections readable and recoverable", () => {
  const { values, storage } = memory([["vela.active-host-id", "remembered"]]);
  assert.equal(readSelectionPreference({ getItem: storage.getItem }, "opencraft.active-host-id", identity), "remembered");
  storage.setItem = () => { throw new Error("quota"); };
  assert.equal(readSelectionPreference(storage, "opencraft.active-host-id", identity), "remembered");
  assert.throws(() => writeSelectionPreference(storage, "opencraft.active-host-id", "next", identity), /quota/);
  assert.deepEqual([...values], [["vela.active-host-id", "remembered"]]);
});

test("a failed alias removal cannot clear the current selection and revive stale history", () => {
  const { values, storage } = memory([["opencraft.active-host-id", "current"], ["vela.active-host-id", "old"]]);
  storage.removeItem = () => { throw new Error("blocked"); };
  assert.throws(() => writeSelectionPreference(storage, "opencraft.active-host-id", null, identity), /blocked/);
  assert.equal(values.get("opencraft.active-host-id"), "current");
});

test("website migration preserves current local intent across both namespace generations", () => {
  for (const localPrefix of ["vela", "opencraft"]) {
    const { values, storage } = memory([
      ["vela.active-host-id", "hypernode"],
      ["vela.active-thread-id:hypernode", "previous-thread"],
      [`${localPrefix}.active-thread-id:local`, "local-thread"],
      ["vela.selected-project-id:hypernode", "previous-project"],
    ]);
    restoreLegacyWebsiteSelection(storage);
    assert.equal(values.get("opencraft.active-host-id"), "local");
    assert.equal(values.get("opencraft.active-thread-id:local"), "local-thread");
    assert.equal(values.get("opencraft.selected-project-id:local"), "previous-project");
    assert.equal([...values.keys()].some(key => key.startsWith("vela.")), false);
    const snapshot = [...values]; restoreLegacyWebsiteSelection(storage);
    assert.deepEqual([...values], snapshot);
  }
});
