import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createInterface, type Interface as ReadLineInterface } from "node:readline";
import { join } from "node:path";

import type { DuplexTransport, TransportStatus } from "@opencraft/appserver-client/transport";
import { LOGICAL_CLIENT_FIELD } from "@opencraft/app-host-protocol";
import {
  OPENCRAFT_FIRST_TURN_DURABILITY_CAPABILITY,
  OPENCRAFT_THREAD_START_DURABILITY_EXTENSION,
} from "@opencraft/appserver-protocol";
import {
  CodexAccountService,
  CodexCoreControlClient,
  acquireCodexWriter,
  type CodexMaintenanceClientFactory,
} from "@opencraft/account-pool-host";

import WebSocket from "ws";

type RpcRecord = Record<string, unknown>;

interface PendingRequest {
  readonly clientId: string;
  readonly originalId: string | number;
  readonly method: string;
  readonly params: RpcRecord;
  readonly subscriptionRevision?: number;
  readonly wasSubscribed?: boolean;
}

function record(value: unknown): RpcRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RpcRecord : {};
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function responseId(value: unknown): string | number | null {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Codex account operation failed";
}

function withCodexHostCapabilities(value: unknown): RpcRecord {
  const result = record(value);
  const capabilities = record(result.capabilities);
  const extensions = record(capabilities.extensions);
  return {
    ...result,
    capabilities: {
      ...capabilities,
      extensions: {
        ...extensions,
        [OPENCRAFT_THREAD_START_DURABILITY_EXTENSION]:
          OPENCRAFT_FIRST_TURN_DURABILITY_CAPABILITY,
      },
    },
  };
}

export class CodexEngineAdapter implements DuplexTransport {
  private readonly listeners = new Set<(frame: string) => void>();
  private readonly statusListeners = new Set<(status: TransportStatus) => void>();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly initializeWaiters: PendingRequest[] = [];
  private readonly initializedClients = new Set<string>();
  private readonly threadClients = new Map<string, Set<string>>();
  private readonly serverRequests = new Map<string, string>();
  private readonly disconnectedClients = new Set<string>();
  private readonly subscriptionRevisions = new Map<string, number>();
  private statusValue: TransportStatus = { state: "idle" };
  private sequence = 0;
  private child: ChildProcessWithoutNullStreams | null = null;
  private lines: ReadLineInterface | null = null;
  private initializeResult: unknown | null = null;
  private physicalInitializePending = false;
  private accounts: CodexAccountService | null = null;
  private releaseWriter: (() => void) | null = null;
  private remote: WebSocket | null = null;
  private control: CodexCoreControlClient | null = null;
  private stderrTail = "";
  private closeOperation: Promise<void> | null = null;

  constructor(private readonly options: {
    readonly coreEndpoint?: string;
    readonly coreAuthToken?: string;
    readonly executable: string;
    readonly runtimeDirectory: string;
    readonly dataDirectory: string;
    readonly nativeCodexHomeDirectory: string;
    readonly upstreamBaseUrl?: string;
    readonly fetch?: typeof fetch;
    readonly createMaintenanceClient?: CodexMaintenanceClientFactory;
    readonly spawnAppServer?: (input: {
      readonly args: readonly string[];
      readonly cwd: string;
      readonly env: NodeJS.ProcessEnv;
    }) => ChildProcessWithoutNullStreams;
  }) {}

  get status(): TransportStatus { return this.statusValue; }

  async connect(signal?: AbortSignal): Promise<void> {
    if (this.statusValue.state === "open") return;
    if (signal?.aborted) throw signal.reason;
    this.publishStatus({ state: "connecting" });
    try {
      if (this.options.coreEndpoint !== undefined) {
        await this.connectCore(signal);
        this.publishStatus({ state: "open" });
        return;
      }
      this.releaseWriter = await acquireCodexWriter(this.options.dataDirectory);
      const runtimeRoot = join(this.options.dataDirectory, "runtime");
      await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
      this.accounts = await CodexAccountService.start(this.options);
      const launch = this.accounts.launch();
      const childArgs = ["app-server", "--stdio", ...launch.args];
      const childEnv: NodeJS.ProcessEnv = {
          ...process.env,
          ...launch.env,
          CODEX_HOME: runtimeRoot,
          OPENAI_API_KEY: "opencraft-account-pool",
          CODEX_API_KEY: undefined,
          CODEX_ACCESS_TOKEN: undefined,
      };
      const child = this.options.spawnAppServer?.({
        args: childArgs,
        cwd: this.options.runtimeDirectory,
        env: childEnv,
      }) ?? spawn(this.options.executable, childArgs, {
        cwd: this.options.runtimeDirectory,
        env: childEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.child = child;
      child.stderr.on("data", chunk => { this.stderrTail = `${this.stderrTail}${String(chunk)}`.slice(-4_000); });
      this.lines = createInterface({ input: child.stdout });
      this.lines.on("line", this.receivePhysicalLine);
      child.once("error", this.fail);
      child.once("close", (code, childSignal) => {
        if (["closing", "closed"].includes(this.statusValue.state)) return;
        this.fail(new Error(`Codex AppServer exited (${code ?? childSignal ?? "unknown"})${this.stderrTail ? `: ${this.stderrTail}` : ""}`));
      });
      const abort = () => { void this.close(); };
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) {
        await this.close();
        throw signal.reason;
      }
      this.publishStatus({ state: "open" });
      signal?.removeEventListener("abort", abort);
    } catch (error) {
      await this.close();
      this.fail(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async connectCore(signal?: AbortSignal): Promise<void> {
    this.control = new CodexCoreControlClient(this.options.coreEndpoint!, this.options.coreAuthToken ?? "");
    const health = await this.control.health(signal);
    const socket = new WebSocket(`ws+unix://${health.nativeSocket}:/`, { handshakeTimeout: 5_000 });
    this.remote = socket;
    socket.on("message", data => this.receivePhysicalLine(String(data)));
    socket.on("error", error => { if (this.statusValue.state === "open") this.fail(new Error(`Codex core connection failed: ${error.message}`)); });
    socket.on("close", () => { if (this.statusValue.state === "open") this.fail(new Error("Codex core connection closed")); });
    await new Promise<void>((resolve, reject) => {
      const abort = () => { socket.terminate(); reject(signal?.reason); };
      const cleanup = () => { signal?.removeEventListener("abort", abort); socket.off("error", failed); socket.off("close", closed); };
      const failed = (error: Error) => { cleanup(); reject(new Error(`Codex core connection failed: ${error.message}`, { cause: error })); };
      const closed = () => failed(new Error("Connection closed during startup"));
      socket.once("error", failed);
      socket.once("close", closed);
      socket.once("open", () => { cleanup(); resolve(); });
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
  }

  async send(frame: string): Promise<void> {
    if (this.statusValue.state !== "open") throw new Error("Codex Engine is not connected");
    const message = record(JSON.parse(frame));
    const clientId = string(message[LOGICAL_CLIENT_FIELD]);
    if (!clientId) throw new Error("Codex Engine requires a logical client identity");
    delete message[LOGICAL_CLIENT_FIELD];
    if (message.method === "runtime/client/disconnect") {
      this.disconnectClient(clientId);
      return;
    }
    if (typeof message.method === "string" && message.method.startsWith("opencraft/codex/accounts/")) {
      await this.handleAccountRequest(clientId, message);
      return;
    }
    if (message.method === "initialized") return;
    if (message.method === "initialize") {
      await this.handleInitialize(clientId, message);
      return;
    }
    const id = responseId(message.id);
    if (id !== null && message.method === undefined && ("result" in message || "error" in message)) {
      const owner = this.serverRequests.get(JSON.stringify(id));
      if (owner !== clientId) return;
      this.serverRequests.delete(JSON.stringify(id));
      this.writePhysical(message);
      return;
    }
    if (id !== null && typeof message.method === "string") {
      const physicalId = `opencraft:${++this.sequence}`;
      const params = record(message.params);
      const threadId = string(params.threadId);
      const clients = this.threadClients.get(threadId);
      const wasSubscribed = clients?.has(clientId) ?? false;
      let subscriptionRevision: number | undefined;
      if (message.method === "thread/unsubscribe") {
        this.removeSubscription(threadId, clientId);
        if (!wasSubscribed || this.threadClients.has(threadId)) {
          this.emit({ id, result: { status: wasSubscribed ? "unsubscribed" : "notSubscribed" } }, clientId);
          return;
        }
        subscriptionRevision = this.subscriptionRevisions.get(JSON.stringify([threadId, clientId]));
      } else if (message.method === "thread/resume" || message.method === "turn/start") {
        // Reserve before native resume: pending approval/notifications can precede its response.
        this.subscribeThread(threadId, clientId);
        subscriptionRevision = this.subscriptionRevisions.get(JSON.stringify([threadId, clientId]));
      }
      this.pending.set(physicalId, { clientId, originalId: id, method: message.method, params, wasSubscribed, subscriptionRevision });
      this.writePhysical({ ...message, id: physicalId });
      return;
    }
    this.writePhysical(message);
  }

  subscribeMessage(listener: (frame: string) => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener: (status: TransportStatus) => void): () => void {
    this.statusListeners.add(listener); return () => this.statusListeners.delete(listener);
  }

  close(): Promise<void> {
    if (this.closeOperation !== null) return this.closeOperation;
    this.publishStatus({ state: "closing" });
    this.closeOperation = (async () => {
      const child = this.child;
      this.child = null;
      this.lines?.close();
      this.lines = null;
      this.remote?.terminate();
      this.remote = null;
      this.control = null;
      if (child !== null && child.exitCode === null && child.signalCode === null) {
        await new Promise<void>(resolve => {
          const timer = setTimeout(() => { child.kill("SIGKILL"); }, 2_000);
          timer.unref();
          child.once("close", () => { clearTimeout(timer); resolve(); });
          child.stdin.end();
          child.kill("SIGTERM");
        });
      }
      try { await this.accounts?.close(); }
      finally {
        this.accounts = null;
        this.releaseWriter?.();
        this.releaseWriter = null;
      }
      this.pending.clear();
      this.initializeWaiters.length = 0;
      this.initializedClients.clear();
      this.threadClients.clear();
      this.serverRequests.clear();
      this.disconnectedClients.clear();
      this.subscriptionRevisions.clear();
      this.publishStatus({ state: "closed" });
    })();
    return this.closeOperation;
  }

  private async handleInitialize(clientId: string, message: RpcRecord): Promise<void> {
    const id = responseId(message.id);
    if (id === null) throw new Error("Initialize requires an id");
    const pending: PendingRequest = { clientId, originalId: id, method: "initialize", params: record(message.params) };
    this.disconnectedClients.delete(clientId);
    this.initializedClients.add(clientId);
    if (this.initializeResult !== null) {
      this.emit({ id, result: this.initializeResult }, clientId);
      return;
    }
    if (this.physicalInitializePending) {
      this.initializeWaiters.push(pending);
      return;
    }
    this.physicalInitializePending = true;
    const physicalId = `opencraft:${++this.sequence}`;
    this.pending.set(physicalId, pending);
    this.writePhysical({ ...message, id: physicalId });
  }

  private readonly receivePhysicalLine = (line: string): void => {
    let message: RpcRecord;
    try { message = record(JSON.parse(line)); } catch { return; }
    const id = responseId(message.id);
    if (id !== null) {
      const pending = this.pending.get(String(id));
      if (pending !== undefined) {
        this.pending.delete(String(id));
        if (pending.clientId === "") return; // Internal native unsubscribe acknowledgement.
        if (pending.method === "initialize") {
          this.physicalInitializePending = false;
          if ("result" in message) {
            this.initializeResult = withCodexHostCapabilities(message.result);
            message = { ...message, result: this.initializeResult };
            this.writePhysical({ method: "initialized", params: {} });
          }
          this.emit({ ...message, id: pending.originalId }, pending.clientId);
          for (const waiter of this.initializeWaiters.splice(0)) {
            this.emit("result" in message
              ? { id: waiter.originalId, result: message.result }
              : { id: waiter.originalId, error: message.error }, waiter.clientId);
          }
          return;
        }
        if ("result" in message) this.commitThreadSubscription(pending, message.result);
        else if (pending.subscriptionRevision !== undefined && !this.disconnectedClients.has(pending.clientId)) {
          const threadId = string(pending.params.threadId);
          if (this.subscriptionRevisions.get(JSON.stringify([threadId, pending.clientId])) === pending.subscriptionRevision) {
            if (pending.wasSubscribed) this.subscribeThread(threadId, pending.clientId);
            else {
              this.removeSubscription(threadId, pending.clientId);
              // Another client may have left while this reservation kept the native
              // subscription alive. Rollback must release that final native claim too.
              if (!this.threadClients.has(threadId)) this.unsubscribeNative(threadId);
            }
          }
        }
        this.emit({ ...message, id: pending.originalId }, pending.clientId);
        return;
      }
      const target = this.targetForThread(string(record(message.params).threadId)) ?? this.initializedClients.values().next().value;
      if (typeof message.method === "string" && typeof target === "string") {
        this.serverRequests.set(JSON.stringify(id), target);
        this.emit(message, target);
      }
      return;
    }
    const threadId = string(record(message.params).threadId) || string(record(record(message.params).thread).id);
    const targets = threadId ? [...(this.threadClients.get(threadId) ?? [])] : [];
    if (targets.length === 0) this.emit(message);
    else for (const target of targets) this.emit(message, target);
  };

  private commitThreadSubscription(pending: PendingRequest, result: unknown): void {
    if (pending.method === "thread/start" || pending.method === "thread/fork") {
      const threadId = string(record(record(result).thread).id);
      if (!this.disconnectedClients.has(pending.clientId)) this.subscribeThread(threadId, pending.clientId);
      else if (!this.threadClients.has(threadId)) this.unsubscribeNative(threadId);
    }
  }

  private subscribeThread(threadId: string, clientId: string): void {
    if (!threadId) return;
    this.subscriptionRevisions.set(JSON.stringify([threadId, clientId]), ++this.sequence);
    let clients = this.threadClients.get(threadId);
    if (clients === undefined) { clients = new Set(); this.threadClients.set(threadId, clients); }
    clients.add(clientId);
  }

  private targetForThread(threadId: string): string | undefined {
    return threadId ? this.threadClients.get(threadId)?.values().next().value : undefined;
  }

  private disconnectClient(clientId: string): void {
    this.disconnectedClients.add(clientId);
    this.initializedClients.delete(clientId);
    for (const [threadId, clients] of this.threadClients) {
      if (!clients.has(clientId)) continue;
      this.removeSubscription(threadId, clientId);
      if (!this.threadClients.has(threadId)) this.unsubscribeNative(threadId);
    }
    for (const [id, owner] of this.serverRequests) if (owner === clientId) this.serverRequests.delete(id);
  }

  private removeSubscription(threadId: string, clientId: string): void {
    this.subscriptionRevisions.set(JSON.stringify([threadId, clientId]), ++this.sequence);
    const clients = this.threadClients.get(threadId);
    clients?.delete(clientId);
    if (clients?.size === 0) this.threadClients.delete(threadId);
  }

  private unsubscribeNative(threadId: string): void {
    if (!threadId) return;
    const id = `opencraft:${++this.sequence}`;
    this.pending.set(id, { clientId: "", originalId: id, method: "thread/unsubscribe", params: { threadId } });
    this.writePhysical({ id, method: "thread/unsubscribe", params: { threadId } });
  }

  private async handleAccountRequest(clientId: string, message: RpcRecord): Promise<void> {
    const id = responseId(message.id);
    if (id === null) return;
    try {
      const method = string(message.method);
      const params = record(message.params);
      const result = this.control !== null
        ? await this.control.accountRequest(method, params)
        : await this.accounts!.request(method, params);
      this.emit({ id, result }, clientId);
    } catch (error) {
      this.emit({ id, error: { code: -32020, message: errorMessage(error) } }, clientId);
    }
  }

  private writePhysical(message: RpcRecord): void {
    if (this.remote !== null) {
      if (this.remote.readyState !== WebSocket.OPEN) throw new Error("Codex core connection is closed");
      this.remote.send(JSON.stringify(message));
      return;
    }
    if (this.child === null || this.child.stdin.destroyed) throw new Error("Codex AppServer stdin is closed");
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private emit(message: RpcRecord, clientId?: string): void {
    const frame = JSON.stringify(clientId ? { ...message, [LOGICAL_CLIENT_FIELD]: clientId } : message);
    for (const listener of this.listeners) listener(frame);
  }

  private readonly fail = (error: Error): void => {
    this.publishStatus({ state: "failed", reason: error.message, failure: { code: "codex-appserver-exited", recovery: "automatic" } });
  };

  private publishStatus(status: TransportStatus): void {
    this.statusValue = status;
    for (const listener of this.statusListeners) listener(status);
  }
}
