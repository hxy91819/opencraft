import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { AccountPoolStore, acquireCodexWriter, CodexCoreControlClient } from "@opencraft/account-pool-host";
import { LOGICAL_CLIENT_FIELD } from "@opencraft/app-host-protocol";
import { startCodexCore, type CodexCoreOptions } from "../apps/codex-core/src/main.js";
import { CodexEngineAdapter } from "../apps/opencraft-daemon/src/codex-engine-adapter.js";

const token = "synthetic-core-token-".repeat(3);
async function fixture(configure?: (options: CodexCoreOptions) => Promise<CodexCoreOptions>) {
  const root = await mkdtemp(join(tmpdir(), "oc-core-test-"));
  let options: CodexCoreOptions = {
    endpoint: join(root, "control.sock"), authToken: token,
    executable: process.execPath, runtimeDirectory: root, dataDirectory: join(root, "data"),
    nativeCodexHomeDirectory: join(root, "native"),
    fetch: async () => Response.json({ plan_type: "pro" }),
    spawnAppServer: ({ args, cwd, env }) => spawn(process.execPath,
      [new URL("./fixtures/fake-codex-unix-appserver.mjs", import.meta.url).pathname, args[2]!.slice("unix://".length)],
      { cwd, env, stdio: ["pipe", "pipe", "pipe"] }),
  };
  if (configure) options = await configure(options);
  const core = await startCodexCore(options);
  const control = new CodexCoreControlClient(core.endpoint, token);
  const adapters: CodexEngineAdapter[] = [];
  async function adapter() {
    const engine = new CodexEngineAdapter({ ...options, coreEndpoint: core.endpoint, coreAuthToken: token,
      // Remote mode must not touch any local account store or spawn a child.
      dataDirectory: join(root, "forbidden"), spawnAppServer: () => { throw new Error("Remote mode spawned a writer"); } });
    adapters.push(engine);
    const frames: any[] = [];
    engine.subscribeMessage(frame => frames.push(JSON.parse(frame)));
    await engine.connect();
    let sequence = 0;
    async function rpc(client: string, method: string, params: object = {}) {
      const id = ++sequence;
      await engine.send(JSON.stringify({ id, method, params, [LOGICAL_CLIENT_FIELD]: client }));
      for (let i = 0; i < 300; i++) {
        const frame = frames.find(value => value.id === id && !value.method && value[LOGICAL_CLIENT_FIELD] === client);
        if (frame) { if (frame.error) throw new Error(frame.error.message); return frame.result; }
        await delay(10);
      }
      throw new Error(`Timed out: ${method}`);
    }
    return { engine, rpc, frames };
  }
  return { root, options, core, control, adapter, async close() {
    await Promise.all(adapters.map(engine => engine.close()));
    await core.close(); await rm(root, { recursive: true, force: true });
  } };
}

test("core owns accounts and PID across independent daemon clients and zero connections", async () => {
  const f = await fixture();
  try {
    const before = await f.control.health();
    assert.equal((await stat(f.core.endpoint)).mode & 0o777, 0o600);
    assert.equal((await stat(before.nativeSocket)).mode & 0o777, 0o600);
    await assert.rejects(new CodexCoreControlClient(f.core.endpoint, "wrong").health(), /authentication failed/);
    const a = await f.adapter(), b = await f.adapter();
    await Promise.all([a.rpc("a", "initialize"), b.rpc("b", "initialize")]);
    await mkdir(f.options.nativeCodexHomeDirectory);
    const access = `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600, email: "fixture@example.test",
      "https://api.openai.com/auth": { chatgpt_account_id: "fixture" },
    })).toString("base64url")}.synthetic`;
    await writeFile(join(f.options.nativeCodexHomeDirectory, "auth.json"), JSON.stringify({ auth_mode: "chatgpt",
      tokens: { access_token: access, refresh_token: "fixture-refresh", account_id: "fixture" } }));
    const { account } = await a.rpc("a", "opencraft/codex/accounts/import");
    await b.rpc("b", "opencraft/codex/accounts/setEnabled", { accountId: account.id, enabled: false });
    assert.equal((await a.rpc("a", "opencraft/codex/accounts/list")).accounts[0].enabled, false);
    await a.engine.close(); await b.engine.close();
    assert.deepEqual(await f.control.health(), before);
    const c = await f.adapter();
    const result = await c.rpc("c", "opencraft/codex/accounts/list");
    assert.equal(result.accounts[0].id, account.id);
    assert.doesNotMatch(JSON.stringify(result), /fixture-refresh|\.synthetic/);
    assert.equal(existsSync(join(f.root, "forbidden")), false);
  } finally { await f.close(); }
});

test("logical unsubscribe/disconnect preserves another subscriber, including pending resume", async () => {
  const f = await fixture();
  try {
    const a = await f.adapter(), independent = await f.adapter();
    await a.rpc("a", "initialize"); await a.rpc("b", "initialize"); await independent.rpc("c", "initialize");
    const { thread } = await a.rpc("a", "thread/start");
    const params = { threadId: thread.id };
    await independent.rpc("c", "thread/resume", params);
    const pending = a.rpc("b", "thread/resume", { ...params, fixtureDelay: true });
    await a.rpc("a", "thread/unsubscribe", params);
    await pending;
    await independent.rpc("c", "fixture/publish", { ...params, delta: "still subscribed" });
    await delay(30);
    assert.ok(a.frames.some(frame => frame.method === "item/agentMessage/delta" && frame[LOGICAL_CLIENT_FIELD] === "b"));
    assert.equal((await independent.rpc("c", "fixture/subscribers", params)).count, 2);
    await a.engine.send(JSON.stringify({ method: "runtime/client/disconnect", [LOGICAL_CLIENT_FIELD]: "b" }));
    await delay(30);
    assert.equal((await independent.rpc("c", "fixture/subscribers", params)).count, 1);
    await independent.engine.close();
    assert.ok((await f.control.health()).codexPid);
  } finally { await f.close(); }
});

test("second writer fails before opening accounts and remote unavailability never falls back", async () => {
  const f = await fixture();
  try {
    await assert.rejects(startCodexCore({ ...f.options, endpoint: join(f.root, "second", "control.sock") }), /already owned/);
    const embedded = new CodexEngineAdapter(f.options);
    await assert.rejects(embedded.connect(), /already owned/);
    await embedded.close();
    const remote = new CodexEngineAdapter({ ...f.options, coreEndpoint: join(f.root, "missing.sock"), coreAuthToken: token,
      dataDirectory: join(f.root, "forbidden"), spawnAppServer: () => { throw new Error("Unexpected fallback"); } });
    await assert.rejects(remote.connect(), /Codex core unavailable.*missing.sock/);
    assert.equal(remote.status.state, "failed");
    await remote.close();
    assert.equal(existsSync(join(f.root, "forbidden")), false);
  } finally { await f.close(); }
});

test("failed pending resume releases the native subscription after its last prior subscriber leaves", async () => {
  const f = await fixture();
  try {
    const a = await f.adapter(), observer = await f.adapter();
    await a.rpc("a", "initialize"); await a.rpc("b", "initialize"); await observer.rpc("observer", "initialize");
    const { thread } = await a.rpc("a", "thread/start");
    const params = { threadId: thread.id };
    const rejected = assert.rejects(a.rpc("b", "thread/resume", { ...params, fixtureReject: true }), /Resume rejected/);
    await a.engine.send(JSON.stringify({ method: "runtime/client/disconnect", [LOGICAL_CLIENT_FIELD]: "a" }));
    await rejected;
    assert.equal((await observer.rpc("observer", "fixture/subscribers", params)).count, 0);
    await observer.rpc("observer", "fixture/publish", { ...params, delta: "must not leak to unrelated client" });
    await delay(30);
    assert.equal(a.frames.some(frame => frame.method === "item/agentMessage/delta"), false);
  } finally { await f.close(); }
});

test("core shutdown retains writer ownership until an aborted proxy refresh persists its rotated credential", async () => {
  let finishRefresh!: () => void, startedRefresh!: () => void;
  const heldRefresh = new Promise<void>(resolve => { finishRefresh = resolve; });
  const refreshStarted = new Promise<void>(resolve => { startedRefresh = resolve; });
  let baseUrl = "", hostToken = "", maintenanceClosed = false;
  const f = await fixture(async options => {
    const store = new AccountPoolStore({ databasePath: join(options.dataDirectory, "account-pool.sqlite"),
      secretsDirectory: join(options.dataDirectory, "secrets") });
    store.addAccount({ id: "fixture", provider: "codex", label: "fixture", upstreamAccountId: "fixture", priority: 1, enabled: true },
      { accessToken: "initial-synthetic", refreshToken: "old-synthetic", expiresAt: null });
    store.close();
    return { ...options,
      fetch: async (input, init) => String(input).includes("/wham/usage") ? Response.json({ plan_type: "fixture" })
        : new Headers(init?.headers).get("authorization") === "Bearer initial-synthetic"
          ? new Response(null, { status: 401 }) : Response.json({ ok: true }),
      createMaintenanceClient: async profile => ({
        async request<T>() {
          startedRefresh(); await heldRefresh;
          await writeFile(join(profile, "auth.json"), JSON.stringify({ tokens: {
            account_id: "fixture", access_token: "rotated-synthetic", refresh_token: "new-synthetic",
          } }));
          return {} as T;
        },
        subscribeNotification: () => () => undefined,
        async close() { maintenanceClosed = true; },
      }),
      spawnAppServer(input) {
        const setting = input.args.find(arg => arg.startsWith("model_providers.opencraft-account-pool.base_url="))!;
        baseUrl = JSON.parse(setting.slice(setting.indexOf("=") + 1));
        hostToken = input.env.OPENCRAFT_CODEX_POOL_AUTH_TOKEN!;
        return options.spawnAppServer!(input);
      },
    };
  });
  const abort = new AbortController();
  const inference = fetch(`${baseUrl}/responses`, { method: "POST", headers: {
    "x-opencraft-account-pool-token": hostToken, "content-type": "application/json",
  }, body: JSON.stringify({ model: "fixture", input: [] }), signal: abort.signal }).catch(() => undefined);
  try {
    await Promise.race([refreshStarted, delay(3000).then(() => { throw new Error("Refresh did not start"); })]);
    abort.abort(); await inference;
    let closed = false;
    const closing = f.core.close().then(() => { closed = true; });
    await delay(80);
    assert.equal(closed, false);
    await assert.rejects(acquireCodexWriter(f.options.dataDirectory), /already owned/);
    finishRefresh(); await closing;
    assert.equal(maintenanceClosed, true);
    const release = await acquireCodexWriter(f.options.dataDirectory);
    const reopened = new AccountPoolStore({ databasePath: join(f.options.dataDirectory, "account-pool.sqlite"),
      secretsDirectory: join(f.options.dataDirectory, "secrets") });
    assert.equal(reopened.readCredential("fixture").refreshToken, "new-synthetic");
    reopened.close(); release();
  } finally { finishRefresh(); abort.abort(); await inference; await f.close(); }
});
