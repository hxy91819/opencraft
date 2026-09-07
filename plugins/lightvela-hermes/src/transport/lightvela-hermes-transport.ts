import type { DuplexTransport, TransportStatus } from "@opencraft/appserver-client/transport";

import type { BotTerminalSession } from "../domain/types";
import {
  BrowserHermesAppServerBridge,
  HermesDashboardFileSystem,
  HermesDashboardHistoryClient,
  HermesReplayCheckpoint,
  HermesTatTerminalService,
} from "../hermes-appserver-bridge";
import { ensureHermesDashboard } from "../lib/hermes-dashboard-ensure";
import { resolveHermesDashboardWebSocketUrl } from "../lib/hermes-dashboard-session";
import { createTatWebSocketConstructor } from "../lib/tat-websocket";
import { TatHttpVirtualClient } from "../lib/tat-http-virtual-client";
import { TencentTatSessionMultiplexer } from "../lib/tencent-tat-session-multiplexer";
import type { LightVelaAccountService } from "../account/lightvela-account-service";

export interface LightVelaHermesTransportOptions {
  readonly account: LightVelaAccountService;
  readonly dashboardUrl?: string;
  readonly WebSocketImpl?: typeof WebSocket;
}

function abortError(): Error {
  const error = new Error("LightVela Hermes connection was aborted");
  error.name = "AbortError";
  return error;
}

function waitForOpen(socket: WebSocket, signal?: AbortSignal): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.removeEventListener("open", open);
      socket.removeEventListener("error", error);
      socket.removeEventListener("close", close);
      signal?.removeEventListener("abort", abort);
    };
    const open = () => { cleanup(); resolve(); };
    const error = () => { cleanup(); reject(new Error("Hermes dashboard WebSocket failed")); };
    const close = () => { cleanup(); reject(new Error("Hermes dashboard WebSocket closed before opening")); };
    const abort = () => {
      cleanup();
      try { socket.close(1000, "aborted"); } catch { /* best effort */ }
      reject(abortError());
    };
    socket.addEventListener("open", open, { once: true });
    socket.addEventListener("error", error, { once: true });
    socket.addEventListener("close", close, { once: true });
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** AppServer transport whose physical link is Hermes JSON-RPC over Tencent TAT. */
export class LightVelaHermesTransport implements DuplexTransport {
  private readonly listeners = new Set<(frame: string) => void>();
  private readonly statusListeners = new Set<(status: TransportStatus) => void>();
  private currentStatus: TransportStatus = { state: "idle" };
  private connectPromise: Promise<void> | null = null;
  private generation = 0;
  private bridge: BrowserHermesAppServerBridge | null = null;
  private readonly replayCheckpoint = new HermesReplayCheckpoint();
  private socket: WebSocket | null = null;
  private proxy: TencentTatSessionMultiplexer | null = null;
  private boundBotId: string | null = null;
  private resolvingBinding = false;
  private disposed = false;
  private readonly removeAccountListener: () => void;
  private connectionStartedAt = 0;

  constructor(private readonly options: LightVelaHermesTransportOptions) {
    this.removeAccountListener = options.account.subscribe(() => this.reconcileAccountBinding());
  }

  get status(): TransportStatus { return this.currentStatus; }

  connect(signal?: AbortSignal): Promise<void> {
    if (this.disposed) return Promise.reject(new Error("LightVela Hermes transport is closed"));
    if (this.currentStatus.state === "open") return Promise.resolve();
    if (this.connectPromise !== null) return this.connectPromise;
    if (signal?.aborted) return Promise.reject(abortError());
    const generation = ++this.generation;
    this.connectionStartedAt = Date.now();
    this.logConnection("connect:start", generation);
    this.setStatus({ state: "connecting" });
    this.connectPromise = this.open(generation, signal)
      .catch(async (error) => {
        this.logConnection("connect:failed", generation, {
          reason: error instanceof Error ? error.message : String(error),
        });
        if (generation === this.generation) {
          await this.releasePhysicalConnection();
          this.setStatus({ state: "failed", reason: error instanceof Error ? error.message : String(error) });
        }
        throw error;
      })
      .finally(() => {
        if (generation === this.generation) this.connectPromise = null;
      });
    return this.connectPromise;
  }

  async send(frame: string): Promise<void> {
    const bridge = this.bridge;
    if (this.currentStatus.state !== "open" || bridge === null) {
      throw new Error("LightVela Hermes transport is not open");
    }
    let request: unknown;
    try { request = JSON.parse(frame); } catch { throw new TypeError("AppServer frame is not valid JSON"); }
    const method = request !== null && typeof request === "object" && "method" in request
      ? String((request as { method?: unknown }).method ?? "")
      : "";
    const requestStartedAt = Date.now();
    if (method === "initialize") this.logConnection("appserver:initialize:start", this.generation);
    const response = await bridge.handle(request);
    if (method === "initialize") {
      this.logConnection("appserver:initialize:ready", this.generation, {
        stageMs: Date.now() - requestStartedAt,
      });
    }
    this.emit(JSON.stringify(response));
  }

  subscribeMessage(listener: (frame: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener: (status: TransportStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => this.statusListeners.delete(listener);
  }

  async close(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.removeAccountListener();
    this.generation += 1;
    this.connectPromise = null;
    this.setStatus({ state: "closing" });
    await this.releasePhysicalConnection();
    this.boundBotId = null;
    this.replayCheckpoint.reset();
    this.setStatus({ state: "closed" });
  }

  private async open(generation: number, signal?: AbortSignal): Promise<void> {
    let stageStartedAt = Date.now();
    this.resolvingBinding = true;
    let botId: string;
    try {
      botId = (await this.options.account.resolveActiveBot()).instanceId;
    } finally {
      this.resolvingBinding = false;
    }
    this.logConnection("bot:resolved", generation, {
      instanceId: botId,
      stageMs: Date.now() - stageStartedAt,
    });
    if (signal?.aborted || generation !== this.generation) throw abortError();
    if (this.boundBotId !== botId) {
      this.replayCheckpoint.reset();
      this.boundBotId = botId;
    }
    const createSession = () => this.options.account.request<BotTerminalSession>(
      `/v1/instances/${encodeURIComponent(botId)}/tat/session`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    const WebSocketImpl = this.options.WebSocketImpl ?? globalThis.WebSocket;
    stageStartedAt = Date.now();
    const bootstrap = await createSession();
    this.logConnection("tat:session-created", generation, { stageMs: Date.now() - stageStartedAt });
    if (signal?.aborted || generation !== this.generation) throw abortError();
    const proxy = new TencentTatSessionMultiplexer(bootstrap, { WebSocketImpl });
    this.proxy = proxy;
    stageStartedAt = Date.now();
    const sessionToken = await ensureHermesDashboard(proxy);
    this.logConnection("hermes:backend-ready", generation, { stageMs: Date.now() - stageStartedAt });
    stageStartedAt = Date.now();
    const dashboardUrl = await resolveHermesDashboardWebSocketUrl(
      bootstrap,
      this.options.dashboardUrl ?? "ws://127.0.0.1:9119/api/ws",
      { proxyClient: proxy, sessionToken },
    );
    this.logConnection("hermes:endpoint-resolved", generation, { stageMs: Date.now() - stageStartedAt });
    if (signal?.aborted || generation !== this.generation) throw abortError();
    const TatWebSocket = createTatWebSocketConstructor(proxy, { origin: `http://${dashboardUrl.host}` });
    const socket = new TatWebSocket(dashboardUrl);
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    stageStartedAt = Date.now();
    await waitForOpen(socket, signal);
    this.logConnection("hermes:websocket-open", generation, { stageMs: Date.now() - stageStartedAt });
    if (generation !== this.generation) throw abortError();
    const bridge = new BrowserHermesAppServerBridge(socket, {
      defaultCwd: bootstrap.workingDirectory ?? "/",
      replayCheckpoint: this.replayCheckpoint,
      fileSystem: new HermesDashboardFileSystem(
        new TatHttpVirtualClient(bootstrap, {
          proxyClient: proxy,
          target: { host: "127.0.0.1", port: 9119 },
        }),
        sessionToken,
      ),
      history: new HermesDashboardHistoryClient(
        new TatHttpVirtualClient(bootstrap, {
          proxyClient: proxy,
          target: { host: "127.0.0.1", port: 9119 },
        }),
        sessionToken,
      ),
      terminal: new HermesTatTerminalService({
        createSession,
        WebSocketImpl,
      }),
    });
    bridge.onNotification((notification) => this.emit(JSON.stringify(notification)));
    this.bridge = bridge;
    socket.addEventListener("close", (event) => {
      if (generation !== this.generation) return;
      const closeEvent = event as CloseEvent;
      this.bridge?.dispose();
      this.bridge = null;
      this.socket = null;
      this.proxy?.close();
      this.proxy = null;
      this.setStatus({
        state: "closed",
        ...(closeEvent.wasClean ? {} : { reason: closeEvent.reason || `Hermes closed with code ${closeEvent.code}` }),
      });
    });
    this.logConnection("connect:open", generation);
    this.setStatus({ state: "open" });
  }

  private async releasePhysicalConnection(): Promise<void> {
    this.bridge?.dispose();
    this.bridge = null;
    const socket = this.socket;
    this.socket = null;
    if (socket !== null && socket.readyState < WebSocket.CLOSING) {
      try { socket.close(1000, "OpenCraft Host closing"); } catch { /* best effort */ }
    }
    this.proxy?.close();
    this.proxy = null;
  }

  private emit(frame: string): void {
    for (const listener of this.listeners) listener(frame);
  }

  private setStatus(status: TransportStatus): void {
    if (this.currentStatus.state !== status.state) {
      this.logConnection(`status:${this.currentStatus.state}->${status.state}`, this.generation);
    }
    this.currentStatus = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private logConnection(
    stage: string,
    generation: number,
    details: Readonly<Record<string, unknown>> = {},
  ): void {
    console.log("[lightvela-hermes]", {
      stage,
      generation,
      elapsedMs: this.connectionStartedAt === 0 ? 0 : Date.now() - this.connectionStartedAt,
      ...details,
    });
  }

  private reconcileAccountBinding(): void {
    if (this.disposed || this.resolvingBinding || this.boundBotId === null) return;
    const snapshot = this.options.account.getSnapshot();
    if (snapshot.phase !== "authenticated" && snapshot.phase !== "anonymous") return;
    if (snapshot.activeBotId === this.boundBotId) return;
    const retiredBotId = this.boundBotId;
    const generation = ++this.generation;
    this.connectPromise = null;
    this.boundBotId = null;
    this.replayCheckpoint.reset();
    this.setStatus({ state: "closing" });
    void this.releasePhysicalConnection().finally(() => {
      if (this.disposed || generation !== this.generation) return;
      this.setStatus({
        state: "closed",
        reason: snapshot.activeBotId === null
          ? `LightVela Bot ${retiredBotId} is no longer available`
          : `LightVela Bot binding changed to ${snapshot.activeBotId}`,
      });
    });
  }
}
