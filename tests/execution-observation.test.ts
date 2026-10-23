import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConversationSchedules, type ScheduleExecutionPort, type ScheduleExecutionEvent } from "../packages/host-schedules/src/index.js";
import { serializeHistoryReply, AppServerRpcError, threadUnavailableReason, isRetryableAppServerRpcError } from "../packages/appserver-client/src/index.js";
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
async function fixture(t: test.TestContext, overrides: Partial<ScheduleExecutionPort> = {}) {
  const root = await mkdtemp(join(tmpdir(), "oc-execution-observe-")); let listener: ((event: ScheduleExecutionEvent) => void) | undefined, now = 1800000000000;
  let inspections = 0, sends = 0, detached = false;
  const port: ScheduleExecutionPort = { validate: async () => {},
    subscribe: l => { listener = l; return () => { detached = true; }; },
    submit: async run => { sends++; return { state: "running", turnId: `turn:${run.threadId}` }; },
    inspect: async () => { inspections++; return { state: "running" }; }, ...overrides };
  const service = new ConversationSchedules(root, port, () => now);
  t.after(async () => { await service.close(); await rm(root, { recursive: true, force: true }); });
  const save = (threadId = "a") => service.handle("opencraft/schedules/save", { threadId, expectedRevision: 0, prompt: "work", nextRunAt: now, intervalMinutes: null, timeZone: "UTC" }, null);
  return { service, port, save, event: (event: ScheduleExecutionEvent) => listener?.(event), advance: (ms: number) => { now += ms; },
    get inspections() { return inspections; }, get sends() { return sends; }, get detached() { return detached; } };
}
test("native completion settles the exact occurrence without history inspection or poll delay", async t => {
  const f = await fixture(t); await f.save(); await f.service.tick();
  f.event({ threadId: "a", turnId: "older", state: "failed" }); await f.service.tick();
  assert.equal(f.service.read("a").runs[0]?.state, "running");
  f.event({ threadId: "a", turnId: "turn:a", state: "completed" }); await f.service.tick();
  assert.equal(f.service.read("a").schedule?.status, "completed"); assert.equal(f.inspections, 0); assert.equal(f.sends, 1);
  await f.service.close(); assert(f.detached);
  f.event({ threadId: "a", turnId: "turn:a", state: "failed" }); // Retired callbacks cannot read closed storage.
});
test("completion arriving before the submit acknowledgement is retained until exact binding", async t => {
  const gate = deferred(), entered = deferred(); const f = await fixture(t, { submit: async () => { entered.resolve(); await gate.promise; return { state: "running", turnId: "early" }; } });
  await f.save(); const tick = f.service.tick(); await entered.promise;
  f.event({ threadId: "a", turnId: "early", state: "completed" }); gate.resolve(); await tick;
  assert.equal(f.service.read("a").runs[0]?.state, "completed"); assert.equal(f.inspections, 0);
});
test("native completion wins an older in-flight inspection, including a failed query", async t => {
  for (const rejected of [false, true]) {
    const gate = deferred(), entered = deferred(); const f = await fixture(t, { inspect: async () => { entered.resolve(); await gate.promise; if (rejected) throw new Error("read lost"); return { state: "running" }; } });
    await f.save(); await f.service.tick(); f.advance(61000); const tick = f.service.tick(); await entered.promise;
    f.event({ threadId: "a", turnId: "turn:a", state: "completed" }); gate.resolve(); await tick; await f.service.tick();
    assert.equal(f.service.read("a").runs[0]?.state, "completed");
  }
});
test("one blocked execution does not prevent another conversation from being admitted", async t => {
  const gate = deferred(), healthy = deferred(); const f = await fixture(t, { submit: async run => { if (run.threadId === "a") await gate.promise; else healthy.resolve(); return { state: "running", turnId: run.threadId }; } });
  await f.save("a"); await f.save("b"); const tick = f.service.tick();
  try { await Promise.race([healthy.promise, new Promise((_, reject) => setTimeout(() => reject(new Error("peer blocked")), 1000))]); }
  finally { gate.resolve(); await tick; }
  assert.equal(f.service.read("b").runs[0]?.state, "running");
});
test("an exact terminal event may resolve uncertain acceptance without re-submission", async t => {
  const f = await fixture(t, { submit: async () => ({ state: "unknown", turnId: "known" }) }); await f.save(); await f.service.tick();
  f.event({ threadId: "a", turnId: "known", state: "completed" }); await f.service.tick();
  assert.equal(f.service.read("a").runs[0]?.state, "completed"); assert.equal(f.inspections, 0);
});
test("history byte budgets preserve RPC identity and fail only that response, with exact UTF-8 accounting", () => {
  const frame = { jsonrpc: "2.0", id: 7, _clientId: "one", result: { text: "中😀".repeat(200) } };
  const raw = JSON.stringify(frame), size = Buffer.byteLength(raw);
  assert.equal(serializeHistoryReply(frame, "thread/turns/list", size), raw);
  const failed = JSON.parse(serializeHistoryReply(frame, "thread/turns/list", size - 1));
  assert.equal(failed.id, 7); assert.equal(failed._clientId, "one"); assert.equal(failed.result, undefined);
  assert.equal(failed.error.data.code, "HISTORY_RESPONSE_TOO_LARGE");
  assert(!isRetryableAppServerRpcError(new AppServerRpcError(failed.error))); assert.equal(threadUnavailableReason(new AppServerRpcError(failed.error)), null);
  assert.equal(JSON.parse(serializeHistoryReply({ id: 8, result: { data: [] } }, "thread/read", 1024)).id, 8);
  assert.equal(serializeHistoryReply(frame, "turn/start", 1), raw); // No mutation truncation or implicit retry.
});

test("a held admission cannot block peer completion or later peer work", async t => {
  const gate = deferred(), entered = deferred(); const f = await fixture(t, { submit: async run => {
    if (run.threadId === "a") { entered.resolve(); await gate.promise; }
    return { state: "running", turnId: `turn:${run.threadId}` };
  } });
  await f.save("a"); const held = f.service.tick(); await entered.promise;
  try {
    await f.save("b"); await f.service.tick();
    f.event({ threadId: "b", turnId: "turn:b", state: "completed" }); await f.service.tick();
    assert.equal(f.service.read("b").schedule?.status, "completed");
    for (const id of ["c", "d", "e", "f", "g"]) await f.save(id);
    for (let i = 0; i < 5; i++) await f.service.tick();
    for (const id of ["c", "d", "e", "f", "g"]) assert.equal(f.service.read(id).runs[0]?.state, "running");
  } finally { gate.resolve(); await held; }
});

test("failure to persist native completion backs off without spinning or resubmitting", async t => {
  const f = await fixture(t); await f.save(); await f.service.tick();
  const service = f.service as any, write = service.writeRun.bind(service); let failures = 0, fail = true;
  service.writeRun = (run: any) => {
    if (run.state === "completed" && fail) {
      failures++;
      if (failures > 1) void f.service.close(); // Bound a failing baseline's microtask loop.
      throw new Error("Synthetic durable write failure");
    }
    return write(run);
  };
  f.event({ threadId: "a", turnId: "turn:a", state: "completed" }); await f.service.tick();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(failures, 1); assert.equal(f.service.read("a").runs[0]?.state, "running");
  fail = false; f.advance(30001); await f.service.tick();
  assert.equal(f.service.read("a").runs[0]?.state, "completed"); assert.equal(f.sends, 1); assert.equal(f.inspections, 0);
});
