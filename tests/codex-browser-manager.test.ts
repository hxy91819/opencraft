import assert from "node:assert/strict";
import test from "node:test";
import { BrowserPresentationSwitch } from "../apps/workbench-web/src/browser/browser-presentation-switch";
import { createCodexBrowserManager } from "../apps/workbench-web/src/browser/codex-browser-manager";
import { CodexPresentationHost } from "../apps/workbench-web/src/browser/codex-presentation-host";

test("local host fences old refs and does not focus staged/blocked guest", () => {
  const env = environment();
  try {
    const actions: string[] = [];
    const container = { style: {}, isConnected: true } as unknown as HTMLElement;
    const guest = { focus: () => actions.push("focus") } as unknown as HTMLElement;
    const host = new CodexPresentationHost({ conversationId: "c", browserTabId: "b" }, {
      container, guest, ready: Promise.resolve(), commit: () => actions.push("commit"),
      park: () => actions.push("park"), close: () => {}, clearCover: () => {}, cover: () => {},
    });
    host.markRegistered();
    const oldRef = {}, newRef = {}, layout = { visualBounds: { x: 0, y: 0, width: 400, height: 500 }, stageBounds: { x: 0, y: 0, width: 400, height: 500 }, viewportSize: { width: 400, height: 500 }, scale: 1 };
    host.stage({ ...state, layout }, oldRef);
    host.reveal(oldRef, true);
    assert.equal(actions.includes("focus"), false);
    host.setAutomationActive(true);
    host.setAutomationActive(false);
    assert.equal(actions.includes("focus"), false, "automation release must not revoke the source handoff's interaction block");
    host.finishReveal();
    assert.equal(actions.includes("focus"), true);
    host.sync({ ...state, layout, mountGeneration: 2 }, newRef);
    host.detach(oldRef, 1);
    assert.equal(host.isPainted(), true);
    host.detach(oldRef, 2);
    assert.equal(host.isPainted(), true);
    host.detach(newRef, 2);
    assert.equal(host.isPainted(), false);
  } finally { env.close(); }
});


function environment() {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const frames = new Map<number, () => void>(), timers = new Map<number, () => void>();
  let serial = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame(fn: () => void) { frames.set(++serial, fn); return serial; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
    setTimeout(fn: () => void) { timers.set(++serial, fn); return serial; },
    clearTimeout(id: number) { timers.delete(id); },
  } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { addEventListener() {}, removeEventListener() {}, visibilityState: "visible" } });
  return {
    frames, timers,
    tick() { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()); },
    close() {
      if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else delete (globalThis as any).window;
      if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else delete (globalThis as any).document;
    },
  };
}
class Host {
  painted = false; blocked = false; generation = 1; registered = false; events: string[] = [];
  constructor(readonly id: string) {}
  getConversationId() { return "owner"; } getBrowserTabId() { return this.id; }
  getMountGeneration() { return this.generation; }
  isPainted() { return this.painted; } isConnected() { return true; }
  sync(state: any) { this.generation = state.mountGeneration; this.painted = state.isVisible; this.blocked = false; }
  stage(state: any) { this.sync(state); this.events.push("stage"); this.blocked = true; }
  reveal(_ref: unknown, blocked: boolean) { this.painted = true; this.blocked = blocked; this.events.push("reveal"); }
  detach(_ref: unknown, generation: number) { if (generation === this.generation) { this.painted = false; this.events.push("detach"); } }
  releaseRef() {} blockInteraction() { this.blocked = true; }
  restoreInteraction() { this.blocked = false; }
  finishReveal() { this.blocked = false; this.events.push("finish"); }
  listenForDidRegister() { return () => {}; }
  placeImmediatelyBehind() {} expandToCoverStagedBounds() {} clearStagedCoverBounds() {}
}
const state = { mountGeneration: 1, isVisible: true, shouldPaint: true, bounds: { x: 0, y: 0, width: 500, height: 500 }, scale: 1 };

test("panel replacement keeps outgoing until ack, prewarm, and next-frame release", () => {
  const env = environment();
  try {
    const transition = new BrowserPresentationSwitch(), a = new Host("a"), b = new Host("b");
    transition.sync(a, state, {}, "right-panel");
    transition.sync(b, state, {}, "right-panel");
    assert.equal(a.painted, true); assert.equal(a.blocked, true);
    assert.equal(b.blocked, true); assert.equal(env.frames.size, 0);
    transition.acknowledgeAttachment(b, 0, 1);
    assert.equal(env.frames.size, 0);
    transition.acknowledgeAttachment(b, 1, 1);
    env.tick(); env.tick();
    assert.equal(a.painted, true); assert.equal(b.blocked, true);
    env.tick();
    assert.equal(a.painted, false); assert.equal(b.blocked, false);
    assert.deepEqual(b.events.slice(-2), ["reveal", "finish"]);
    transition.disposeAll();
    assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
  } finally { env.close(); }
});

test("A to B to C fences a late B prewarm callback and preserves the correct outgoing host", () => {
  const env = environment();
  try {
    const transition = new BrowserPresentationSwitch(), a = new Host("a"), b = new Host("b"), c = new Host("c");
    transition.sync(a, state, {}, "right-panel");
    transition.sync(b, state, {}, "right-panel");
    transition.acknowledgeAttachment(b, 1, 1);
    const late = [...env.frames.values()][0]!;
    transition.sync(c, state, {}, "right-panel");
    late();
    assert.equal(b.painted, false); assert.equal(a.painted, true);
    transition.acknowledgeAttachment(c, 1, 1);
    env.tick(); env.tick(); env.tick();
    assert.equal(c.blocked, false); assert.equal(a.painted, false);
    assert.equal(b.events.includes("finish"), false);
    transition.disposeAll();
  } finally { env.close(); }
});

test("presentation manager owns storage modes and mount claims", () => {
  const env = environment();
  try {
    const manager = createCodexBrowserManager(Host as any);
    const id = manager.getBrowserStorageId("owner", "tab");
    assert.equal(manager.tabPersistenceStates.get("owner\0tab").mode, "ephemeral");
    assert.equal(manager.getPagePersistence("owner", "tab").browserStorageId, id);
    assert.equal(manager.tabPersistenceStates.get("owner\0tab").mode, "persistent");
    manager.restorePersistedPageState("owner", "tab", id);
    assert.equal(manager.getPagePersistence("owner", "tab").restore, "required");
    const first = manager.claimMountGeneration("owner", "tab", "a");
    assert.equal(manager.claimMountGeneration("owner", "tab", "b"), first);
    manager.releaseMountGeneration("owner", "tab", "a", first);
    assert.equal(manager.hasOtherMountGenerationClaim("owner", "tab", "a", first), true);
    manager.releaseMountGeneration("owner", "tab", "b", first);
    const next = manager.claimMountGeneration("owner", "tab", "a");
    assert.equal(next, first + 1);
    manager.releaseMountGeneration("owner", "tab", "a", first);
    assert.equal(manager.hasOtherMountGenerationClaim("owner", "tab", "other", next), true);
    manager.disposeAll();
  } finally { env.close(); }
});

test("disposing a panel replacement cancels scheduled frames and timeout and fences callbacks", () => {
  const env = environment();
  try {
    const transition = new BrowserPresentationSwitch(), a = new Host("a"), b = new Host("b");
    transition.sync(a, state, {}, "right-panel");
    transition.sync(b, state, {}, "right-panel");
    transition.acknowledgeAttachment(b, 1, 1);
    const late = [...env.frames.values()][0]!;
    transition.disposeAll();
    assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
    late();
    assert.equal(a.painted, false); assert.equal(b.painted, false);
    assert.equal(b.events.includes("finish"), false);
  } finally { env.close(); }
});

test("remounting a staged host requires the new generation's acknowledgement", () => {
  const env = environment();
  try {
    const transition = new BrowserPresentationSwitch(), a = new Host("a"), b = new Host("b");
    transition.sync(a, state, {}, "right-panel");
    transition.sync(b, state, {}, "right-panel");
    transition.sync(b, { ...state, mountGeneration: 2 }, {}, "right-panel");
    transition.acknowledgeAttachment(b, 1, 2);
    assert.equal(env.frames.size, 0);
    transition.acknowledgeAttachment(b, 2, 2);
    env.tick(); env.tick(); env.tick();
    assert.equal(b.painted, true); assert.equal(b.generation, 2); assert.equal(a.painted, false);
    transition.disposeAll();
  } finally { env.close(); }
});

test("readiness fallback completes a switch and hidden incoming cancels it", () => {
  const env = environment();
  try {
    const transition = new BrowserPresentationSwitch(), a = new Host("a"), b = new Host("b");
    transition.sync(a, state, {}, "right-panel");
    transition.sync(b, state, {}, "right-panel");
    const timeouts = [...env.timers.values()]; env.timers.clear(); timeouts.forEach(run => run());
    env.tick(); env.tick(); env.tick();
    assert.equal(a.painted, false); assert.equal(b.blocked, false);
    transition.sync(a, state, {}, "right-panel");
    transition.sync(a, { ...state, isVisible: false }, {}, "right-panel");
    assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
    assert.equal(a.painted, false); assert.equal(b.painted, false);
    transition.disposeAll();
  } finally { env.close(); }
});

test("readiness registration cannot resurrect a disposed host and failed readiness is retired", async () => {
  const env = environment();
  let ready!: () => void, fail!: (error: Error) => void;
  let preparation = new Promise<void>(resolve => { ready = resolve; });
  class PreparedHost extends Host {
    disposed = false;
    constructor(options: any) { super(options.browserTabId); }
    whenReady() { return preparation; }
    markRegistered() { this.registered = true; return true; }
    setBrowserUseActive() {} setBrowserUseViewportSize() {} releaseBrowserUse() {}
    setHostKind() {} setPagePersistence() { return false; }
    resync() {} dispose() { this.disposed = true; }
  }
  try {
    const manager = createCodexBrowserManager(PreparedHost as any);
    const first = manager.getWebview("owner", "a", "") as unknown as PreparedHost;
    manager.disposeWebviewHost("owner", "a", "owner\0a", "closed");
    ready(); await Promise.resolve(); await Promise.resolve();
    assert.equal(first.disposed, true); assert.equal(first.registered, false);
    preparation = new Promise<void>((_resolve, reject) => { fail = reject; });
    const second = manager.getWebview("owner", "b", "") as unknown as PreparedHost;
    fail(new Error("surface unavailable")); await Promise.resolve(); await Promise.resolve();
    assert.equal(second.disposed, true); assert.equal(manager.webviews.size, 0);
    manager.disposeAll();
    assert.throws(() => manager.claimMountGeneration("owner", "c"), /disposed/);
  } finally { env.close(); }
});
