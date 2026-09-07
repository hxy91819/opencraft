import { Service, type Context } from "@deepseek-ai/cordis";

import { HermesAppServerAdapter } from "./adapter";
import { HermesBotAppServerHandler } from "./bot-protocol-handler";
import type { HermesHostFileSystem } from "./dashboard-file-system";
import type { HermesHistoryClient } from "./history-client";
import type { HermesHostTerminal } from "./tat-terminal";
import { dispatchAppServerRequest } from "./protocol";
import {
  HermesRpcError,
  HermesRpcWebSocketTransport,
  type HermesRpcTransportOptions,
  type HermesSocket,
} from "./rpc-transport";
import type {
  AppServerNotification,
  JsonRpcFailure,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types";

export interface BrowserHermesBridgeOptions extends HermesRpcTransportOptions {
  defaultCwd?: string;
  fileSystem?: HermesHostFileSystem;
  history?: HermesHistoryClient;
  terminal?: HermesHostTerminal;
}

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const failure = (
  id: JsonRpcRequest["id"] | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcFailure => ({
  jsonrpc: "2.0",
  id,
  error: { code, message, ...(data === undefined ? {} : { data }) },
});

/** In-browser protocol translator. It never owns or closes the supplied socket. */
export class BrowserHermesAppServerBridge {
  private readonly transport: HermesRpcWebSocketTransport;
  private readonly adapter: HermesAppServerAdapter;
  private readonly bots: HermesBotAppServerHandler;
  private readonly notificationListeners = new Set<(event: AppServerNotification) => void>();
  private readonly stopNotifications: () => void;
  private readonly stopTerminalNotifications: () => void;
  private disposed = false;

  constructor(socket: HermesSocket, private readonly options: BrowserHermesBridgeOptions = {}) {
    this.transport = new HermesRpcWebSocketTransport(socket, options);
    this.adapter = new HermesAppServerAdapter(this.transport, options.defaultCwd ?? "/", options.history);
    this.bots = new HermesBotAppServerHandler(this.adapter, (event) => {
      const notification: AppServerNotification = { jsonrpc: "2.0", ...event };
      for (const listener of this.notificationListeners) listener(notification);
    });
    this.stopNotifications = this.adapter.subscribeNotification((method, params) => {
      this.bots.observeAppServerNotification(method, params);
      const notification: AppServerNotification = { jsonrpc: "2.0", method, params };
      for (const listener of this.notificationListeners) listener(notification);
    });
    this.stopTerminalNotifications = options.terminal?.subscribeNotification((notification) => {
      for (const listener of this.notificationListeners) listener(notification);
    }) ?? (() => undefined);
  }

  onNotification(listener: (event: AppServerNotification) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  async request(method: string, params: unknown = {}): Promise<unknown> {
    if (this.disposed) throw new Error("Hermes AppServer bridge is detached");
    return dispatchAppServerRequest(this.adapter, { jsonrpc: "2.0", id: 0, method, params }, {
      fileSystem: this.options.fileSystem,
      terminal: this.options.terminal,
      bots: this.bots,
    });
  }

  async handle(value: unknown): Promise<JsonRpcResponse> {
    if (!isObject(value) || typeof value.method !== "string") {
      return failure(null, -32600, "invalid AppServer JSON-RPC request");
    }
    const id = typeof value.id === "string" || typeof value.id === "number" ? value.id : null;
    if (id === null) return failure(null, -32600, "AppServer request id must be a string or number");
    const request: JsonRpcRequest = {
      ...(value.jsonrpc === "2.0" ? { jsonrpc: "2.0" as const } : {}),
      id,
      method: value.method,
      ...(Object.hasOwn(value, "params") ? { params: value.params } : {}),
    };
    try {
      return {
        jsonrpc: "2.0",
        id,
        result: await dispatchAppServerRequest(this.adapter, request, {
          fileSystem: this.options.fileSystem,
          terminal: this.options.terminal,
          bots: this.bots,
        }),
      };
    } catch (error) {
      const code = isObject(error) && typeof error.rpcCode === "number" ? error.rpcCode : -32000;
      const data = error instanceof HermesRpcError
        ? { hermesCode: error.code, details: error.details }
        : isObject(error) && isObject(error.domainData)
          ? error.domainData
          : undefined;
      return failure(id, code, error instanceof Error ? error.message : String(error), data);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopNotifications();
    this.stopTerminalNotifications();
    this.notificationListeners.clear();
    this.adapter.dispose();
    this.options.fileSystem?.dispose();
    this.options.history?.dispose();
    this.options.terminal?.dispose();
    this.transport.dispose();
  }
}

export class HermesAppServerBridgeService extends Service {
  private readonly bridges = new Set<BrowserHermesAppServerBridge>();

  constructor(ctx: Context) {
    super(ctx, "hermesAppServerBridge");
    ctx.effect(() => () => {
      for (const bridge of this.bridges) bridge.dispose();
      this.bridges.clear();
    });
  }

  attach(socket: HermesSocket, options?: BrowserHermesBridgeOptions): BrowserHermesAppServerBridge {
    const bridge = new BrowserHermesAppServerBridge(socket, options);
    this.bridges.add(bridge);
    return bridge;
  }

  detach(bridge: BrowserHermesAppServerBridge): void {
    bridge.dispose();
    this.bridges.delete(bridge);
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    hermesAppServerBridge: HermesAppServerBridgeService;
  }
}

export type { AppServerNotification, JsonRpcRequest, JsonRpcResponse } from "./types";
export { HermesRpcError } from "./rpc-transport";
export { HermesDashboardFileSystem } from "./dashboard-file-system";
export type { HermesHostFileSystem } from "./dashboard-file-system";
export { HermesDashboardHistoryClient } from "./history-client";
export type { HermesHistoryClient, HermesHistoryPageRequest } from "./history-client";
export { HermesTatTerminalService } from "./tat-terminal";
export type { HermesHostTerminal } from "./tat-terminal";
export { HermesReplayCheckpoint } from "./rpc-transport";
