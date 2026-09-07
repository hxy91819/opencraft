export const LIGHTVELA_API_BASE = "https://api.lightvela.ai";
export const LIGHTVELA_TOKEN_KEY = "vela.lightvela.session-token.v1";
export const LIGHTVELA_ACTIVE_BOT_KEY = "vela.lightvela.active-bot.v1";

export interface LightVelaBotInstance {
  readonly createdAt: string;
  readonly instanceId: string;
  readonly name: string;
  readonly status: string;
}

export type LightVelaAccountPhase =
  | "anonymous"
  | "loading"
  | "authenticated"
  | "error";

export interface LightVelaAccountSnapshot {
  readonly revision: number;
  readonly phase: LightVelaAccountPhase;
  readonly bots: readonly LightVelaBotInstance[];
  /** Current physical Bot binding for the stable velahermes0 Host. */
  readonly activeBotId: string | null;
  readonly error: string | null;
}

interface ApiEnvelope<T> {
  readonly code: string;
  readonly data: T;
  readonly message: string;
  readonly request_id?: string;
}

interface BotListResponse {
  readonly items: readonly {
    readonly created_at: string;
    readonly instance_id: string;
    readonly name?: string;
    readonly status: string;
  }[];
}

export interface LightVelaAccountServiceOptions {
  readonly apiBase?: string;
  readonly storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  readonly fetchImpl?: typeof fetch;
  readonly location?: Pick<Location, "origin" | "pathname" | "search" | "hash" | "assign">;
  readonly history?: Pick<History, "state" | "replaceState">;
}

export class LightVelaApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "LightVelaApiError";
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { readonly message?: string; readonly request_id?: string };
    return `${body.message || `HTTP ${response.status}`}${body.request_id ? ` request_id=${body.request_id}` : ""}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Owns only the LightVela browser account and Bot catalog. Hermes transports
 * borrow the current token through request(); they never persist credentials.
 */
export class LightVelaAccountService {
  private readonly apiBase: string;
  private readonly storage: LightVelaAccountServiceOptions["storage"];
  private readonly fetchImpl: typeof fetch;
  private readonly location: LightVelaAccountServiceOptions["location"];
  private readonly history: LightVelaAccountServiceOptions["history"];
  private readonly listeners = new Set<() => void>();
  private revision = 0;
  private refreshGeneration = 0;
  private refreshOperation: Promise<readonly LightVelaBotInstance[]> | null = null;
  private snapshot: LightVelaAccountSnapshot = Object.freeze({
    revision: 0,
    phase: "anonymous",
    bots: Object.freeze([]),
    activeBotId: null,
    error: null,
  });

  constructor(options: LightVelaAccountServiceOptions = {}) {
    this.apiBase = (options.apiBase ?? LIGHTVELA_API_BASE).replace(/\/$/u, "");
    this.storage = options.storage ?? globalThis.localStorage;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.location = options.location ?? globalThis.location;
    this.history = options.history ?? globalThis.history;
  }

  getSnapshot = (): LightVelaAccountSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  hasStoredSession(): boolean {
    return (this.storage?.getItem(LIGHTVELA_TOKEN_KEY)?.trim().length ?? 0) > 0;
  }

  bootstrapOAuthFragment(): boolean {
    const fragment = new URLSearchParams(this.location?.hash.slice(1) ?? "");
    const token = fragment.get("session_token")?.trim();
    if (!token || this.storage === undefined) return false;
    this.storage.setItem(LIGHTVELA_TOKEN_KEY, token);
    fragment.delete("session_token");
    const nextHash = fragment.toString();
    this.history?.replaceState(
      this.history.state,
      "",
      `${this.location?.pathname ?? "/"}${this.location?.search ?? ""}${nextHash ? `#${nextHash}` : ""}`,
    );
    return true;
  }

  signIn(): void {
    if (this.location === undefined) throw new Error("LightVela login requires a browser location");
    const returnTo = `${this.location.origin}${this.location.pathname}${this.location.search}`;
    this.location.assign(`${this.apiBase}/auth/oauth/google/start?return_to=${encodeURIComponent(returnTo)}`);
  }

  signOut(): void {
    this.refreshGeneration += 1;
    this.refreshOperation = null;
    this.storage?.removeItem(LIGHTVELA_TOKEN_KEY);
    this.storage?.removeItem(LIGHTVELA_ACTIVE_BOT_KEY);
    this.publish("anonymous", [], null, null);
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = this.storage?.getItem(LIGHTVELA_TOKEN_KEY)?.trim();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await this.fetchImpl(`${this.apiBase}${path}`, {
      credentials: "include",
      ...init,
      // Account and Bot bindings are control-plane authority, never browser
      // cache material. A cached catalog can resurrect a deleted physical Bot
      // underneath the stable velahermes0 Host identity.
      cache: "no-store",
      headers,
    });
    if (!response.ok) throw new LightVelaApiError(await errorMessage(response), response.status);
    return (await response.json() as ApiEnvelope<T>).data;
  }

  refreshBots(): Promise<readonly LightVelaBotInstance[]> {
    if (this.refreshOperation !== null) return this.refreshOperation;
    const operation = this.performBotRefresh().finally(() => {
      if (this.refreshOperation === operation) this.refreshOperation = null;
    });
    this.refreshOperation = operation;
    return operation;
  }

  private async performBotRefresh(): Promise<readonly LightVelaBotInstance[]> {
    const generation = ++this.refreshGeneration;
    this.publish("loading", this.snapshot.bots, null, this.snapshot.activeBotId);
    try {
      const result = await this.request<BotListResponse>("/v1/instances?page=1&page_size=100");
      const bots = result.items
        .filter((bot) => bot.status.toLowerCase() === "running")
        .map((bot) => Object.freeze({
          createdAt: bot.created_at,
          instanceId: bot.instance_id,
          name: bot.name?.trim() || "Untitled Bot",
          status: bot.status,
        }));
      if (generation === this.refreshGeneration) {
        this.publish("authenticated", bots, null, this.reconcileActiveBot(bots));
      }
      return bots;
    } catch (error) {
      if (generation === this.refreshGeneration) {
        this.publish(
          error instanceof LightVelaApiError && error.status === 401 ? "anonymous" : "error",
          [],
          error instanceof Error ? error.message : String(error),
          null,
        );
      }
      throw error;
    }
  }

  /**
   * Changes only the physical Bot selected inside the LightVela account. The
   * Workbench Host identity remains velahermes0 and must never persist this
   * ephemeral instance ID as its namespace identity.
   */
  selectBot(instanceId: string): void {
    const normalized = instanceId.trim();
    if (this.snapshot.phase !== "authenticated") {
      throw new Error("A LightVela Bot can only be selected after authentication");
    }
    if (!this.snapshot.bots.some((bot) => bot.instanceId === normalized)) {
      throw new Error(`LightVela Bot ${normalized || "<empty>"} is not running`);
    }
    if (this.snapshot.activeBotId === normalized) return;
    this.storage?.setItem(LIGHTVELA_ACTIVE_BOT_KEY, normalized);
    this.publish("authenticated", this.snapshot.bots, null, normalized);
  }

  /** Resolves a fresh physical Bot binding for a new TAT connection. */
  async resolveActiveBot(): Promise<LightVelaBotInstance> {
    await this.refreshBots();
    const snapshot = this.snapshot;
    const bot = snapshot.activeBotId === null
      ? undefined
      : snapshot.bots.find((candidate) => candidate.instanceId === snapshot.activeBotId);
    if (snapshot.phase !== "authenticated" || bot === undefined) {
      throw new Error("No running LightVela Hermes Bot is available");
    }
    return bot;
  }

  dispose(): void {
    this.refreshGeneration += 1;
    this.refreshOperation = null;
    this.listeners.clear();
  }

  private publish(
    phase: LightVelaAccountPhase,
    bots: readonly LightVelaBotInstance[],
    error: string | null,
    activeBotId: string | null,
  ): void {
    this.snapshot = Object.freeze({
      revision: ++this.revision,
      phase,
      bots: Object.freeze([...bots]),
      activeBotId,
      error,
    });
    for (const listener of this.listeners) listener();
  }

  private reconcileActiveBot(bots: readonly LightVelaBotInstance[]): string | null {
    const candidates = [
      this.snapshot.activeBotId,
      this.storage?.getItem(LIGHTVELA_ACTIVE_BOT_KEY)?.trim() || null,
    ];
    const activeBotId = candidates.find((candidate) =>
      candidate !== null && bots.some((bot) => bot.instanceId === candidate))
      ?? bots[0]?.instanceId
      ?? null;
    if (activeBotId === null) this.storage?.removeItem(LIGHTVELA_ACTIVE_BOT_KEY);
    else this.storage?.setItem(LIGHTVELA_ACTIVE_BOT_KEY, activeBotId);
    return activeBotId;
  }
}
