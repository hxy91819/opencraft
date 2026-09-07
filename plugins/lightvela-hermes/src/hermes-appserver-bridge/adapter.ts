import { HermesRpcError, type HermesRpcClient } from "./rpc-transport";
import type { HermesHistoryClient } from "./history-client";
import {
  decodeHermesModelSelection,
  hermesModelSwitchArgument,
  mapHermesModelOptions,
  modelSelectionFromExecution,
} from "./model-catalog";
import type {
  AppServerThread,
  AppServerTurn,
  HermesMessage,
  HermesModelOptionsPayload,
  HermesProfileSummary,
  HermesSessionPayload,
  HermesSessionSummary,
  QueuedSubmission,
} from "./types";
import { HermesTurnEventStateMachine } from "./turn-event-state-machine";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

type HermesImageInput =
  | { kind: "bytes"; contentBase64: string; filename: string }
  | { kind: "path"; path: string };

interface ParsedInput {
  body: string;
  content: Record<string, unknown>[];
  images: HermesImageInput[];
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.flatMap((part) => {
    if (typeof part === "string") return [part];
    if (typeof part === "object" && part !== null && typeof (part as { text?: unknown }).text === "string") return [(part as { text: string }).text];
    return [];
  }).join("\n");
}

function messageText(message: HermesMessage): string {
  return typeof message.text === "string" ? message.text : text(message.content);
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function imageExtension(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg": return "jpg";
    case "image/gif": return "gif";
    case "image/webp": return "webp";
    case "image/bmp": return "bmp";
    default: return "png";
  }
}

function filenameForUrl(url: string, mimeType: string, index: number): string {
  try {
    const candidate = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    if (candidate !== undefined && /\.[a-z0-9]{2,5}$/iu.test(candidate)) return candidate;
  } catch {
    // Data URLs and malformed path hints use the deterministic fallback below.
  }
  return `image-${index + 1}.${imageExtension(mimeType)}`;
}

function parseDataImage(url: string, index: number): HermesImageInput | null {
  const match = /^data:(image\/[a-z0-9.+-]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/isu.exec(url);
  if (match === null) return null;
  const contentBase64 = match[2]!.replace(/\s/gu, "");
  if (contentBase64.length === 0) throw new Error("Hermes image attachment is empty");
  const decodedBytes = Math.floor(contentBase64.length * 3 / 4);
  if (decodedBytes > MAX_IMAGE_BYTES) throw new Error(`Hermes image attachment exceeds ${MAX_IMAGE_BYTES} bytes`);
  return {
    kind: "bytes",
    contentBase64,
    filename: `image-${index + 1}.${imageExtension(match[1]!)}`,
  };
}

async function remoteImage(url: string, index: number): Promise<HermesImageInput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const mimeType = (response.headers.get("content-type") ?? "").split(";", 1)[0]!.trim().toLowerCase();
    if (!mimeType.startsWith("image/")) throw new Error(`unexpected content type ${mimeType || "unknown"}`);
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) throw new Error(`image exceeds ${MAX_IMAGE_BYTES} bytes`);
    if (response.body === null) throw new Error("empty response body");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error(`image exceeds ${MAX_IMAGE_BYTES} bytes`);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      kind: "bytes",
      contentBase64: bytesToBase64(bytes),
      filename: filenameForUrl(url, mimeType, index),
    };
  } catch (error) {
    throw new Error(`Cannot load Hermes image attachment ${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function referenceValue(path: string): string {
  return /\s/u.test(path) ? `\`${path.replaceAll("`", "\\`")}\`` : path;
}

async function parseInput(input: unknown): Promise<ParsedInput> {
  if (!Array.isArray(input)) throw new Error("Hermes input must be an array");
  const body: string[] = [];
  const content: Record<string, unknown>[] = [];
  const images: Array<HermesImageInput | Promise<HermesImageInput>> = [];
  for (const [index, rawPart] of input.entries()) {
    const part = record(rawPart);
    const type = typeof part.type === "string" ? part.type : "";
    if (type === "text" && typeof part.text === "string") {
      body.push(part.text);
      content.push({ ...part, type: "text", text: part.text, text_elements: Array.isArray(part.text_elements) ? part.text_elements : [] });
      continue;
    }
    if (type === "image" && typeof part.url === "string" && part.url !== "") {
      const parsed = parseDataImage(part.url, index);
      if (parsed !== null) images.push(parsed);
      else if (/^https?:\/\//iu.test(part.url)) images.push(remoteImage(part.url, index));
      else throw new Error(`Hermes cannot read image URL scheme: ${part.url.split(":", 1)[0] || "unknown"}`);
      content.push({ ...part, type: "image", url: part.url });
      continue;
    }
    if (type === "localImage" && typeof part.path === "string" && part.path !== "") {
      images.push({ kind: "path", path: part.path });
      content.push({ ...part, type: "localImage", path: part.path });
      continue;
    }
    if (type === "mention" && typeof part.name === "string" && typeof part.path === "string") {
      body.push(`@file:${referenceValue(part.path)}`);
      content.push({ ...part, type: "mention", name: part.name, path: part.path });
      continue;
    }
    if (type === "skill" && typeof part.name === "string" && typeof part.path === "string") {
      body.push(`/${part.name}`);
      content.push({ ...part, type: "skill", name: part.name, path: part.path });
      continue;
    }
    throw new Error(`Hermes bridge does not support AppServer input type: ${type || "unknown"}`);
  }
  return { body: body.join(""), content, images: await Promise.all(images) };
}

function imageDirective(value: string): string | null {
  const match = /^@image:(.*)$/u.exec(value.trim());
  if (match === null) return null;
  const raw = match[1]!.trim();
  return raw.startsWith("`") && raw.endsWith("`") ? raw.slice(1, -1).replaceAll("\\`", "`") : raw;
}

function userMessageContent(message: HermesMessage): Record<string, unknown>[] {
  const source = Array.isArray(message.content) ? message.content : [message.text ?? message.content];
  const result: Record<string, unknown>[] = [];
  const deferredPaths: string[] = [];
  let hasNativeImage = false;
  const appendText = (value: string) => {
    const kept: string[] = [];
    const before = deferredPaths.length;
    for (const line of value.split("\n")) {
      const path = imageDirective(line);
      if (path === null) kept.push(line);
      else deferredPaths.push(path);
    }
    let body = kept.join("\n").trim();
    if (deferredPaths.length > before) body = body.replace(/^\[screenshot\]\n?/gmu, "").trim();
    if (body !== "") result.push({ type: "text", text: body, text_elements: [] });
  };
  for (const rawPart of source) {
    if (typeof rawPart === "string") {
      appendText(rawPart);
      continue;
    }
    const part = record(rawPart);
    if (part.type === "text" && typeof part.text === "string") {
      appendText(part.text);
      continue;
    }
    const nestedImageUrl = record(part.image_url).url;
    if ((part.type === "image_url" || part.type === "input_image") && typeof nestedImageUrl === "string") {
      hasNativeImage = true;
      result.push({ type: "image", url: nestedImageUrl });
      continue;
    }
    if (part.type === "image" && typeof part.url === "string") {
      hasNativeImage = true;
      result.push({ type: "image", url: part.url });
    }
  }
  if (!hasNativeImage) {
    for (const path of deferredPaths) result.push({ type: "localImage", path });
  }
  return result;
}

function timestamp(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return Math.floor(Date.now() / 1000);
  return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
}

function itemFor(message: HermesMessage, sessionId: string, index: number) {
  const body = messageText(message);
  const address = message.row_id ?? message._row_id ?? index;
  if (message.role === "user") return { type: "userMessage", id: `hermes-${sessionId}-${address}`, clientId: null, content: userMessageContent(message) };
  if (message.role === "tool") return {
    type: "dynamicToolCall", id: `hermes-${sessionId}-${address}`, namespace: "hermes",
    tool: typeof message.name === "string" ? message.name : "tool", arguments: record(message.args),
    status: "completed", contentItems: typeof message.context === "string" ? [{ type: "inputText", text: message.context }] : null,
    success: true, durationMs: null,
  };
  return { type: "agentMessage", id: `hermes-${sessionId}-${address}`, text: body, phase: message.role === "assistant" ? null : message.role, memoryCitation: null };
}

interface MappedTurnRange {
  readonly turn: AppServerTurn;
  readonly start: number;
  end: number;
}

function mapMessageRanges(sessionId: string, messages: HermesMessage[], running = false): MappedTurnRange[] {
  const turns: MappedTurnRange[] = [];
  for (const [index, message] of messages.entries()) {
    if (message.role === "user" || turns.length === 0) {
      turns.push({
        start: index,
        end: index + 1,
        turn: {
          id: `hermes-turn-${sessionId}-${message.row_id ?? message._row_id ?? index}`,
          items: [], itemsView: "full", status: "completed", error: null,
          startedAt: null, completedAt: null, durationMs: null,
        },
      });
    }
    const current = turns.at(-1)!;
    current.end = index + 1;
    if (message.role === "user" || message.role === "tool" || messageText(message) !== "") {
      current.turn.items.push(itemFor(message, sessionId, index));
    }
  }
  if (running && turns.length > 0) turns.at(-1)!.turn.status = "inProgress";
  return turns;
}

export function mapMessages(sessionId: string, messages: HermesMessage[], running = false): AppServerTurn[] {
  return mapMessageRanges(sessionId, messages, running).map(({ turn }) => turn);
}

function makeThread(summary: HermesSessionSummary, cwd: string, turns: AppServerTurn[] = [], running = false): AppServerThread {
  const when = timestamp(summary.started_at);
  const title = summary.title.trim() || summary.preview.trim() || "New chat";
  return {
    id: summary.id, sessionId: summary.id, extra: { hermes: {
      source: summary.source,
      messageCount: summary.message_count,
      profile: summary.profile ?? "default",
    } },
    forkedFromId: null, parentThreadId: null, preview: title, ephemeral: false, section: null, sectionEnteredAt: null,
    projectId: null, historyMode: "paginated", modelProvider: "hermes", createdAt: when, updatedAt: when, recencyAt: when,
    status: running ? { type: "active", activeFlags: [] } : { type: "idle" }, path: null, cwd,
    cliVersion: "hemesclient/0.2.0", source: { custom: "hermes" }, canAcceptDirectInput: true, threadSource: null,
    agentNickname: null, agentRole: null, gitInfo: null, name: title, turns,
  };
}

function isSessionNotFound(error: unknown): boolean {
  return error instanceof HermesRpcError
    ? error.code === 4007
    : /session not found/iu.test(error instanceof Error ? error.message : String(error));
}

interface ThreadListParams {
  cursor?: string | null;
  limit?: number | null;
  archived?: boolean | null;
  searchTerm?: string | null;
  sortDirection?: "asc" | "desc" | null;
  profile?: string | null;
  includeHidden?: boolean;
  /** Exact server-side named-session lookup, not a recency-window search. */
  exactTitle?: string | null;
}

interface ThreadStartOptions {
  title?: string;
  hidden?: boolean;
  followProfileConfig?: boolean;
}

interface HermesProjectionScheduler {
  now(): number;
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

interface HermesAdmissionProjection {
  readonly projection: HermesTurnEventStateMachine;
  readonly events: Array<{
    readonly event: Record<string, unknown>;
    readonly occurredAtMs: number;
  }>;
}

const DEFAULT_PROJECTION_SCHEDULER: HermesProjectionScheduler = {
  now: () => Date.now(),
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface HermesTurnSubmission {
  readonly turn: AppServerTurn;
  readonly disposition: "running" | "queued";
}

export class HermesAppServerAdapter {
  private readonly liveByStored = new Map<string, string>();
  private readonly payloadByStored = new Map<string, HermesSessionPayload>();
  private readonly storedByLive = new Map<string, string>();
  private readonly profileByStored = new Map<string, string>();
  /** Cold deep links share one Host-side identity discovery transaction. */
  private readonly profileDiscoveryByStored = new Map<string, Promise<string>>();
  /**
   * One projection owner per physical Hermes session.
   *
   * A completed owner is deliberately retained until the next activation or
   * local Turn. Draft promotion may race the terminal Hermes frame; replacing
   * this owner during `thread/resume` would replay the same physical response
   * through a second AppServer Item identity.
   */
  private readonly activeByLive = new Map<string, HermesTurnEventStateMachine>();
  /** Server-accepted follow-ups waiting behind the physical session lease. */
  private readonly pendingByLive = new Map<string, HermesTurnEventStateMachine[]>();
  /** A queued Turn cannot consume frames until the previous run's idle boundary. */
  private readonly queuedBoundaryPendingByLive = new Set<string>();
  /** Serializes admission only; it never waits for the running Turn to finish. */
  private readonly submissionTailByLive = new Map<string, Promise<void>>();
  /**
   * A candidate Turn cannot own the live event stream before prompt.submit has
   * returned. Frames crossing that transaction boundary are retained here and
   * committed only when Hermes confirms that this exact submission is running.
   */
  private readonly admissionByLive = new Map<string, HermesAdmissionProjection>();
  private readonly settlementTimerByLive = new Map<string, unknown>();
  private readonly queuedByStored = new Map<string, QueuedSubmission[]>();
  private readonly itemsByTurnId = new Map<string, AppServerTurn["items"]>();
  private readonly itemCacheOrder: string[] = [];
  /** One cursor-zero history page shared by Resume and its first page read. */
  private readonly preparedHistoryByStored = new Map<string, {
    readonly limit: number;
    readonly sortDirection: "asc" | "desc";
    readonly page: {
      data: AppServerTurn[];
      chronological: AppServerTurn[];
      nextOffset: number | null;
    };
  }>();
  private readonly notificationListeners = new Set<(method: string, params: unknown) => void>();
  private readonly stopGatewayEvents: () => void;

  constructor(
    private readonly gateway: HermesRpcClient,
    private readonly defaultCwd: string,
    private readonly history?: HermesHistoryClient,
    private readonly projectionScheduler: HermesProjectionScheduler = DEFAULT_PROJECTION_SCHEDULER,
  ) {
    this.stopGatewayEvents = gateway.onEvent((event) => this.projectGatewayEvent(event));
  }

  dispose(): void {
    this.stopGatewayEvents();
    for (const handle of this.settlementTimerByLive.values()) this.projectionScheduler.cancel(handle);
    this.settlementTimerByLive.clear();
    this.admissionByLive.clear();
    this.notificationListeners.clear();
  }

  subscribeNotification(listener: (method: string, params: unknown) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  async listThreads(params: ThreadListParams = {}) {
    if (params.archived === true) return { data: [], nextCursor: null, backwardsCursor: null };
    const profile = params.profile?.trim() || null;
    const response = await this.gateway.call<{ sessions: HermesSessionSummary[] }>("session.list", {
      limit: 1000,
      ...(profile === null ? {} : { profile }),
      ...(params.includeHidden === true ? { include_hidden: true } : {}),
      ...(params.exactTitle?.trim() ? { title: params.exactTitle.trim() } : {}),
    });
    for (const row of response.sessions) {
      this.profileByStored.set(row.id, row.profile?.trim() || profile || "default");
    }
    const query = params.searchTerm?.trim().toLocaleLowerCase();
    let rows = response.sessions.filter((row) => (
      (!params.exactTitle?.trim()
        || row.root_title?.trim() === params.exactTitle.trim()
        || (!row.root_title?.trim() && row.title.trim() === params.exactTitle.trim()))
      && (!query || `${row.title} ${row.preview}`.toLocaleLowerCase().includes(query))
    ));
    if (params.sortDirection === "asc") rows = [...rows].reverse();
    const offset = params.cursor?.startsWith("hermes:") ? Number(params.cursor.slice(7)) || 0 : 0;
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    return {
      data: rows.slice(offset, offset + limit).map((row) => makeThread(row, this.payloadByStored.get(row.id)?.info?.cwd ?? this.defaultCwd)),
      nextCursor: offset + limit < rows.length ? `hermes:${offset + limit}` : null,
      backwardsCursor: offset > 0 ? `hermes:${Math.max(0, offset - limit)}` : null,
    };
  }

  async loadThread(threadId: string, includeTurns: boolean, requestedProfile?: string | null): Promise<AppServerThread> {
    const profile = requestedProfile?.trim()
      || this.profileByStored.get(threadId)
      || await this.resolveThreadProfile(threadId);
    const historyPromise = includeTurns ? this.readTurnsPage(threadId, 0, 120, "desc") : null;
    const [payload, list, historyPage] = await Promise.all([
      this.resume(threadId, profile),
      this.gateway.call<{ sessions: HermesSessionSummary[] }>("session.list", {
        limit: 1000,
        ...(profile === null ? {} : { profile }),
      }),
      historyPromise,
    ]);
    const summary = list.sessions.find((row) => row.id === threadId) ?? {
      id: threadId, title: "New chat", preview: "", started_at: Date.now() / 1000,
      message_count: payload.message_count, source: "desktop", profile: profile ?? "default",
    };
    this.profileByStored.set(threadId, summary.profile?.trim() || profile || "default");
    const turns = historyPage?.chronological ?? [];
    return makeThread(summary, payload.info?.cwd ?? this.defaultCwd, turns, payload.running === true);
  }

  /** Resolve a server-owned named session without depending on list visibility. */
  async resolveNamedThread(profile: string, title: string): Promise<AppServerThread | null> {
    let payload: HermesSessionPayload;
    try {
      payload = await this.gateway.call<HermesSessionPayload>("session.resume", {
        session_id: title,
        defer_history: true,
        omit_messages: true,
        profile,
      });
    } catch (error) {
      if (isSessionNotFound(error)) return null;
      throw error;
    }
    const stored = payload.stored_session_id?.trim() || payload.resumed?.trim();
    if (!stored) {
      throw new Error(`Hermes named-session resume did not return a durable identity for ${title}`);
    }
    this.bindSession(stored, payload, profile);
    return makeThread({
      id: stored,
      title,
      root_title: title,
      preview: "",
      started_at: Date.now() / 1000,
      message_count: payload.message_count,
      source: "desktop",
      profile,
    }, payload.info?.cwd ?? this.defaultCwd, [], payload.running === true);
  }

  async readTurnsPage(
    threadId: string,
    offset: number,
    limit: number,
    sortDirection: "asc" | "desc",
  ): Promise<{
    data: AppServerTurn[];
    chronological: AppServerTurn[];
    nextOffset: number | null;
  }> {
    const prepared = this.preparedHistoryByStored.get(threadId);
    if (
      offset === 0
      && prepared !== undefined
      && prepared.limit === limit
      && prepared.sortDirection === sortDirection
    ) {
      this.preparedHistoryByStored.delete(threadId);
      return prepared.page;
    }
    return this.fetchTurnsPage(threadId, offset, limit, sortDirection);
  }

  /**
   * Fetches the authoritative tail once for a cursor-only Resume. The next
   * matching thread/turns/list consumes this exact page, so runtime binding and
   * transcript hydration cannot observe two different history snapshots.
   */
  async prepareTurnsPage(
    threadId: string,
    limit: number,
    sortDirection: "asc" | "desc",
  ): Promise<{
    data: AppServerTurn[];
    chronological: AppServerTurn[];
    nextOffset: number | null;
  }> {
    const page = await this.fetchTurnsPage(threadId, 0, limit, sortDirection);
    this.preparedHistoryByStored.set(threadId, { limit, sortDirection, page });
    return page;
  }

  private async fetchTurnsPage(
    threadId: string,
    offset: number,
    limit: number,
    sortDirection: "asc" | "desc",
  ): Promise<{
    data: AppServerTurn[];
    chronological: AppServerTurn[];
    nextOffset: number | null;
  }> {
    if (!this.history) throw new Error("Hermes durable history port is unavailable");
    const turnLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
    const messageLimit = Math.min(Math.max(turnLimit * 8, 120), 500);
    const page = await this.history.readMessages(threadId, {
      limit: messageLimit,
      offset: Math.max(Math.floor(offset), 0),
      order: sortDirection === "desc" ? "latest" : "oldest",
      includeCompacted: true,
    });
    const ranges = mapMessageRanges(threadId, page.messages);
    const selected = sortDirection === "desc"
      ? ranges.slice(-turnLimit)
      : ranges.slice(0, turnLimit);
    const chronological = selected.map(({ turn }) => turn);
    for (const turn of chronological) this.cacheTurnItems(turn);
    const consumedRows = selected.length === 0
      ? page.messages.length
      : sortDirection === "desc"
        ? page.messages.length - selected[0]!.start
        : selected.at(-1)!.end;
    const pageLimit = page.pagination?.limit ?? messageLimit;
    const hasMoreInsidePage = selected.length < ranges.length;
    const possiblyMoreOnServer = page.messages.length >= pageLimit;
    const nextOffset = hasMoreInsidePage || possiblyMoreOnServer
      ? Math.max(Math.floor(offset), 0) + consumedRows
      : null;
    return {
      data: sortDirection === "desc" ? [...chronological].reverse() : chronological,
      chronological,
      nextOffset,
    };
  }

  async activateProjection(threadId: string, turns: AppServerTurn[]): Promise<{ replayComplete: boolean }> {
    const payload = this.payloadByStored.get(threadId);
    if (!payload) throw new Error(`Hermes runtime is not bound for Thread ${threadId}`);
    const live = payload.session_id;
    const owned = this.activeByLive.get(live);

    // A locally-started Turn already owns this Hermes stream. Activation only
    // attaches the View to that owner; it must never manufacture a second
    // projection state machine from the history tail. This remains true after
    // completion: catch-up frames are then harmlessly absorbed by the settled
    // owner instead of being projected as a second response.
    if (owned !== undefined) {
      const replay = await this.gateway.catchUpSession?.(live) ?? { complete: true };
      if (owned.isCompleted) this.activeByLive.delete(live);
      return { replayComplete: replay.complete };
    }

    // An idle durable snapshot owns its own presentation. There is no live
    // Turn to adopt, so installing a projector on its last completed Turn
    // would incorrectly turn history into an active response during replay.
    if (payload.running !== true) {
      const replay = await this.gateway.catchUpSession?.(live) ?? { complete: true };
      return { replayComplete: replay.complete };
    }

    const lastTurn = turns.at(-1) ?? {
      id: `hermes-turn-${threadId}-live`,
      items: [],
      itemsView: "full" as const,
      status: "inProgress" as const,
      error: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
    };
    // No local owner exists, so this is an adopted externally-running Turn.
    // Install its sole owner before releasing replay.
    this.activeByLive.set(live, new HermesTurnEventStateMachine(threadId, lastTurn));
    lastTurn.status = "inProgress";
    const replay = await this.gateway.catchUpSession?.(live) ?? { complete: true };
    if (this.activeByLive.get(live)?.isCompleted === true) {
      this.activeByLive.delete(live);
    }
    return { replayComplete: replay.complete };
  }

  readTurnItems(turnId: string): AppServerTurn["items"] {
    const items = this.itemsByTurnId.get(turnId);
    if (!items) throw new Error(`Hermes turn not found: ${turnId}`);
    return items;
  }

  async listModels(params: {
    cursor?: unknown;
    limit?: unknown;
    includeHidden?: unknown;
  } = {}) {
    const payload = await this.gateway.call<HermesModelOptionsPayload>(
      "model.options",
      { explicit_only: params.includeHidden !== true },
    );
    const all = mapHermesModelOptions(payload).filter(
      (model) => params.includeHidden === true || !model.hidden,
    );
    const offset = typeof params.cursor === "string" && /^hermes-models:\d+$/u.test(params.cursor)
      ? Number(params.cursor.slice("hermes-models:".length))
      : 0;
    const limit = typeof params.limit === "number"
      ? Math.min(Math.max(Math.floor(params.limit), 1), 200)
      : 100;
    return {
      data: all.slice(offset, offset + limit),
      nextCursor: offset + limit < all.length
        ? `hermes-models:${offset + limit}`
        : null,
    };
  }

  executionModel(threadId: string): string {
    const info = this.payloadByStored.get(threadId)?.info;
    return modelSelectionFromExecution(info?.model, info?.provider);
  }

  private cacheTurnItems(turn: AppServerTurn): void {
    this.itemsByTurnId.set(turn.id, turn.items);
    const previous = this.itemCacheOrder.indexOf(turn.id);
    if (previous >= 0) this.itemCacheOrder.splice(previous, 1);
    this.itemCacheOrder.push(turn.id);
    while (this.itemCacheOrder.length > 1_000) {
      const oldest = this.itemCacheOrder.shift();
      if (oldest !== undefined) this.itemsByTurnId.delete(oldest);
    }
  }

  async startThread(
    cwd?: string | null,
    requestedModel?: unknown,
    requestedProfile?: string | null,
    options: ThreadStartOptions = {},
  ): Promise<AppServerThread> {
    const selection = decodeHermesModelSelection(requestedModel);
    const profile = requestedProfile?.trim() || null;
    const payload = await this.gateway.call<HermesSessionPayload>("session.create", {
      cwd: cwd ?? this.defaultCwd,
      source: "desktop",
      ...(profile === null ? {} : { profile }),
      ...(options.title?.trim() ? { title: options.title.trim() } : {}),
      ...(options.hidden === undefined ? {} : { hidden: options.hidden }),
      ...(options.followProfileConfig === undefined ? {} : { follow_profile_config: options.followProfileConfig }),
      ...(selection === null ? {} : { model: selection.model }),
      ...(selection?.provider == null ? {} : { provider: selection.provider }),
    });
    const stored = payload.stored_session_id ?? payload.session_id;
    this.liveByStored.set(stored, payload.session_id);
    this.storedByLive.set(payload.session_id, stored);
    this.payloadByStored.set(stored, payload);
    this.profileByStored.set(stored, profile ?? "default");
    return makeThread({
      id: stored,
      title: options.title?.trim() || "New chat",
      preview: "",
      started_at: Date.now() / 1000,
      message_count: 0,
      source: "desktop",
      profile: profile ?? "default",
    }, payload.info?.cwd ?? cwd ?? this.defaultCwd);
  }

  /**
   * Turn a lazy live Hermes draft into an addressable durable session.
   * Navigation must never publish the stored id before this transaction ends.
   */
  async materializeThread(threadId: string, title: string, hidden: boolean): Promise<void> {
    const live = await this.ensureLive(threadId);
    const titled = await this.gateway.call<{ pending?: boolean }>("session.title", {
      session_id: live,
      title,
    });
    if (titled.pending === true) {
      throw new Error(`Hermes did not durably materialize session ${threadId}`);
    }
    await this.gateway.call("session.set_hidden", {
      session_id: live,
      hidden,
    });
  }

  async startTurn(
    threadId: string,
    input: unknown,
    requestedModel?: unknown,
    requestedProfile?: string | null,
  ): Promise<AppServerTurn> {
    const submission = await this.submitTurn(
      threadId,
      input,
      requestedModel,
      requestedProfile,
      null,
      false,
    );
    return submission.turn;
  }

  /**
   * Bot traffic uses Hermes' strict queue contract. The returned disposition
   * is transport fact, not UI inference: a busy physical session owns exactly
   * one live process and later messages remain FIFO server work.
   */
  async submitBotTurn(
    threadId: string,
    input: unknown,
    clientUserMessageId: string,
    requestedModel?: unknown,
    requestedProfile?: string | null,
  ): Promise<HermesTurnSubmission> {
    return await this.submitTurn(
      threadId,
      input,
      requestedModel,
      requestedProfile,
      clientUserMessageId,
      true,
    );
  }

  private async submitTurn(
    threadId: string,
    input: unknown,
    requestedModel: unknown,
    requestedProfile: string | null | undefined,
    clientUserMessageId: string | null,
    allowWhileLocallyBusy: boolean,
  ): Promise<HermesTurnSubmission> {
    const parsed = await parseInput(input);
    if (parsed.body.trim() === "" && parsed.images.length === 0) throw new Error("Hermes input is empty");
    const live = await this.ensureLive(threadId, requestedProfile);
    return await this.withSubmissionAdmission(live, async () => {
      return await this.submitTurnAgainstLive(
        threadId,
        live,
        parsed,
        requestedModel,
        clientUserMessageId,
        allowWhileLocallyBusy,
      );
    });
  }

  private async submitTurnAgainstLive(
    threadId: string,
    live: string,
    parsed: Awaited<ReturnType<typeof parseInput>>,
    requestedModel: unknown,
    clientUserMessageId: string | null,
    allowWhileLocallyBusy: boolean,
  ): Promise<HermesTurnSubmission> {
    const previousOwner = this.activeByLive.get(live);
    const payload = this.payloadByStored.get(threadId);
    const knownBusy = (previousOwner !== undefined && !previousOwner.isCompleted)
      || payload?.running === true
      || this.queuedBoundaryPendingByLive.has(live)
      || (this.pendingByLive.get(live)?.length ?? 0) > 0;
    if (!allowWhileLocallyBusy && knownBusy) {
      throw new Error(`Hermes thread is already running: ${threadId}`);
    }
    await this.applyModelSelection(threadId, live, requestedModel);
    const turn: AppServerTurn = {
      id: `hermes-turn-${crypto.randomUUID()}`,
      items: [{
        type: "userMessage",
        id: `hermes-user-${crypto.randomUUID()}`,
        clientId: clientUserMessageId,
        content: parsed.content,
      }],
      itemsView: "full", status: "inProgress", error: null, startedAt: Math.floor(Date.now() / 1000), completedAt: null, durationMs: null,
    };
    const projection = new HermesTurnEventStateMachine(threadId, turn);
    if (!knownBusy) {
      this.admissionByLive.set(live, { projection, events: [] });
    }
    let stagedPaths: string[] = [];
    try {
      stagedPaths = await this.stageImages(live, parsed.images);
      const result = await this.gateway.call<{ status?: string }>("prompt.submit", {
        session_id: live,
        text: parsed.body,
        // This is a physical-admission invariant, not a Composer preference.
        // A client can observe an AppServer Turn as settled while Hermes is
        // still unwinding its process lease. Strict queueing makes that race
        // FIFO instead of redirecting/interruption of the just-finished run.
        queued: true,
      });
      if (result.status === "queued") {
        this.releaseAdmission(live, projection);
        const pending = this.pendingByLive.get(live) ?? [];
        pending.push(projection);
        this.pendingByLive.set(live, pending);
        this.queuedBoundaryPendingByLive.add(live);
        return { turn, disposition: "queued" };
      }
      const admission = this.releaseAdmission(live, projection);
      this.activeByLive.set(live, projection);
      this.emitProjection(projection.accept(this.projectionScheduler.now()));
      if (admission !== undefined) this.commitAdmissionEvents(live, projection, admission.events);
      return { turn, disposition: "running" };
    } catch (error) {
      await this.rollbackImages(live, stagedPaths);
      this.releaseAdmission(live, projection);
      if (this.activeByLive.get(live) === projection) this.activeByLive.delete(live);
      const pending = this.pendingByLive.get(live);
      if (pending !== undefined) {
        const index = pending.indexOf(projection);
        if (index >= 0) pending.splice(index, 1);
        if (pending.length === 0) this.pendingByLive.delete(live);
      }
      throw error;
    }
  }

  private async withSubmissionAdmission<T>(live: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.submissionTailByLive.get(live) ?? Promise.resolve();
    const result = previous.then(operation, operation);
    const tail = result.then(() => undefined, () => undefined);
    this.submissionTailByLive.set(live, tail);
    try {
      return await result;
    } finally {
      if (this.submissionTailByLive.get(live) === tail) this.submissionTailByLive.delete(live);
    }
  }

  private releaseAdmission(
    live: string,
    projection: HermesTurnEventStateMachine,
  ): HermesAdmissionProjection | undefined {
    const admission = this.admissionByLive.get(live);
    if (admission?.projection !== projection) return undefined;
    this.admissionByLive.delete(live);
    return admission;
  }

  private commitAdmissionEvents(
    live: string,
    projection: HermesTurnEventStateMachine,
    events: HermesAdmissionProjection["events"],
  ): void {
    // Old-process tail frames can cross the RPC boundary. Only a positive live
    // boundary can establish that the remaining frames belong to this Turn.
    const firstOwnedIndex = events.findIndex(({ event }) => (
      event.type === "message.start"
      || (event.type === "session.info"
        && typeof event.payload === "object"
        && event.payload !== null
        && (event.payload as Record<string, unknown>).running === true)
    ));
    if (firstOwnedIndex < 0) return;
    for (const { event, occurredAtMs } of events.slice(firstOwnedIndex)) {
      if (this.activeByLive.get(live) !== projection || projection.isCompleted) break;
      this.projectEventIntoOwner(live, projection, event, occurredAtMs);
    }
  }

  async steerTurn(threadId: string, expectedTurnId: string | null, input: unknown): Promise<{ turnId: string }> {
    const parsed = await parseInput(input);
    if (parsed.images.length > 0) throw new Error("Hermes session.steer accepts text only; send the image as a queued follow-up");
    if (parsed.body.trim() === "") throw new Error("Hermes steer input is empty");
    const live = await this.ensureLive(threadId);
    const active = this.activeByLive.get(live);
    if (active === undefined || active.isCompleted) {
      throw new Error(`Hermes thread has no active turn: ${threadId}`);
    }
    if (expectedTurnId !== null && expectedTurnId !== active.turn.id) {
      throw new Error(`Hermes active turn changed: expected ${expectedTurnId}, got ${active.turn.id}`);
    }
    const result = await this.gateway.call<{ status?: string }>("session.steer", { session_id: live, text: parsed.body });
    if (result.status === "rejected") throw new Error("Hermes rejected the active-turn steer");
    return { turnId: active.turn.id };
  }

  addQueuedSubmission(threadId: string, input: unknown, clientUserMessageId: string): QueuedSubmission {
    this.validateQueuedInput(input);
    const submission: QueuedSubmission = {
      id: `hermes-queue-${crypto.randomUUID()}`,
      input: Array.isArray(input) ? structuredClone(input) : [],
      clientUserMessageId,
    };
    const queue = this.queuedByStored.get(threadId) ?? [];
    queue.push(submission);
    this.queuedByStored.set(threadId, queue);
    this.emitQueueChanged(threadId);
    return structuredClone(submission);
  }

  listQueuedSubmissions(threadId: string, cursor: string | null, limit: number | null) {
    const queue = this.queuedByStored.get(threadId) ?? [];
    const offset = cursor?.startsWith("hermes-queue:") ? Number(cursor.slice(13)) || 0 : 0;
    const size = Math.min(Math.max(limit ?? 50, 1), 200);
    return {
      data: structuredClone(queue.slice(offset, offset + size)),
      nextCursor: offset + size < queue.length ? `hermes-queue:${offset + size}` : null,
    };
  }

  updateQueuedSubmission(threadId: string, queuedSubmissionId: string, input: unknown): QueuedSubmission {
    this.validateQueuedInput(input);
    const queue = this.queuedByStored.get(threadId) ?? [];
    const index = queue.findIndex((item) => item.id === queuedSubmissionId);
    if (index < 0) throw new Error(`Hermes queued submission not found: ${queuedSubmissionId}`);
    const updated = { ...queue[index]!, input: Array.isArray(input) ? structuredClone(input) : [] };
    queue[index] = updated;
    this.emitQueueChanged(threadId);
    return structuredClone(updated);
  }

  deleteQueuedSubmission(threadId: string, queuedSubmissionId: string): boolean {
    const queue = this.queuedByStored.get(threadId) ?? [];
    const index = queue.findIndex((item) => item.id === queuedSubmissionId);
    if (index < 0) return false;
    queue.splice(index, 1);
    this.emitQueueChanged(threadId);
    return true;
  }

  reorderQueuedSubmissions(threadId: string, queuedSubmissionIds: string[]): void {
    const queue = this.queuedByStored.get(threadId) ?? [];
    if (queuedSubmissionIds.length !== queue.length || new Set(queuedSubmissionIds).size !== queue.length) {
      throw new Error("queuedSubmissionIds must contain every queued submission exactly once");
    }
    const byId = new Map(queue.map((item) => [item.id, item]));
    const reordered = queuedSubmissionIds.map((id) => {
      const item = byId.get(id);
      if (item === undefined) throw new Error(`Hermes queued submission not found: ${id}`);
      return item;
    });
    this.queuedByStored.set(threadId, reordered);
    this.emitQueueChanged(threadId);
  }

  async startQueuedSubmission(threadId: string, queuedSubmissionId?: string | null): Promise<AppServerTurn> {
    const live = await this.ensureLive(threadId);
    const owner = this.activeByLive.get(live);
    if (owner !== undefined && !owner.isCompleted) {
      throw new Error(`Hermes thread is already running: ${threadId}`);
    }
    const queue = this.queuedByStored.get(threadId) ?? [];
    const index = queuedSubmissionId == null ? 0 : queue.findIndex((item) => item.id === queuedSubmissionId);
    if (index < 0 || queue[index] === undefined) throw new Error("Hermes queue is empty or the submission no longer exists");
    const [submission] = queue.splice(index, 1);
    this.emitQueueChanged(threadId);
    try {
      return (await this.submitTurn(
        threadId,
        submission!.input,
        undefined,
        undefined,
        submission!.clientUserMessageId,
        true,
      )).turn;
    } catch (error) {
      queue.splice(index, 0, submission!);
      this.emitQueueChanged(threadId);
      throw error;
    }
  }

  async cancelTurn(threadId: string): Promise<void> {
    await this.gateway.call("session.interrupt", { session_id: await this.ensureLive(threadId) });
  }

  private validateQueuedInput(input: unknown): void {
    if (!Array.isArray(input) || input.length === 0) throw new Error("Hermes input is empty");
    let hasContent = false;
    for (const rawPart of input) {
      const part = record(rawPart);
      const type = part.type;
      if (type === "text" && typeof part.text === "string") {
        hasContent ||= part.text.trim() !== "";
        continue;
      }
      if (type === "image" && typeof part.url === "string" && part.url !== "") {
        hasContent = true;
        continue;
      }
      if (type === "localImage" && typeof part.path === "string" && part.path !== "") {
        hasContent = true;
        continue;
      }
      if ((type === "mention" || type === "skill") && typeof part.name === "string" && typeof part.path === "string") {
        hasContent = true;
        continue;
      }
      throw new Error(`Hermes bridge does not support AppServer input type: ${typeof type === "string" ? type : "unknown"}`);
    }
    if (!hasContent) throw new Error("Hermes input is empty");
  }

  private async stageImages(live: string, images: HermesImageInput[]): Promise<string[]> {
    const stagedPaths: string[] = [];
    try {
      for (const image of images) {
        const result = image.kind === "bytes"
          ? await this.gateway.call<{ attached?: boolean; path?: string; message?: string }>("image.attach_bytes", {
              session_id: live,
              content_base64: image.contentBase64,
              filename: image.filename,
            })
          : await this.gateway.call<{ attached?: boolean; path?: string; message?: string }>("image.attach", {
              session_id: live,
              path: image.path,
            });
        if (result.attached !== true || typeof result.path !== "string" || result.path === "") {
          throw new Error(result.message ?? "Hermes did not accept the image attachment");
        }
        stagedPaths.push(result.path);
      }
      return stagedPaths;
    } catch (error) {
      await this.rollbackImages(live, stagedPaths);
      throw error;
    }
  }

  private async rollbackImages(live: string, paths: string[]): Promise<void> {
    await Promise.allSettled(paths.map((path) => this.gateway.call("image.detach", { session_id: live, path })));
  }

  async listProfiles(): Promise<readonly HermesProfileSummary[]> {
    const result = await this.gateway.call<{ profiles?: HermesProfileSummary[] }>(
      "profiles.list",
      { include_sessions: true },
    );
    const profiles = Array.isArray(result.profiles) ? result.profiles : [];
    for (const profile of profiles) {
      const name = profile.name.trim() || "default";
      for (const session of [profile.canonical_session, profile.last_session]) {
        if (typeof session?.id === "string" && session.id.trim() !== "") {
          this.profileByStored.set(session.id, name);
        }
      }
    }
    return profiles;
  }

  createProfile(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.gateway.call("profiles.create", params);
  }

  configureProfile(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.gateway.call("profiles.configure", params);
  }

  async deleteProfile(name: string): Promise<void> {
    try {
      await this.gateway.call("profiles.delete", { name });
    } catch {
      const result = await this.gateway.call<{ blocked?: boolean; code?: number; hint?: string; output?: string }>(
        "cli.exec",
        { argv: ["profile", "delete", name, "--yes"] },
      );
      if (result.blocked === true || (typeof result.code === "number" && result.code !== 0)) {
        throw new Error(result.hint || result.output || `Could not delete profile ${name}`);
      }
    }
  }

  profileForThread(threadId: string): string {
    return this.profileByStored.get(threadId) ?? "default";
  }

  /**
   * Hermes partitions sessions by Profile while AppServer exposes one Host
   * conversation namespace. The bridge therefore reconstructs that ownership
   * before Resume; routes and React must never carry a Hermes Profile hint.
   */
  private resolveThreadProfile(threadId: string): Promise<string> {
    const known = this.profileByStored.get(threadId);
    if (known !== undefined) return Promise.resolve(known);
    const existing = this.profileDiscoveryByStored.get(threadId);
    if (existing !== undefined) return existing;
    const discovery = this.discoverThreadProfile(threadId).finally(() => {
      if (this.profileDiscoveryByStored.get(threadId) === discovery) {
        this.profileDiscoveryByStored.delete(threadId);
      }
    });
    this.profileDiscoveryByStored.set(threadId, discovery);
    return discovery;
  }

  private async discoverThreadProfile(threadId: string): Promise<string> {
    const profiles = await this.listProfiles();
    const hinted = this.profileByStored.get(threadId);
    if (hinted !== undefined) return hinted;

    const matches = (await Promise.all(profiles.map(async (profile) => {
      const name = profile.name.trim() || "default";
      const result = await this.gateway.call<{ sessions?: HermesSessionSummary[] }>("session.list", {
        profile: name,
        include_hidden: true,
        limit: 1000,
      });
      const row = Array.isArray(result.sessions)
        ? result.sessions.find((session) => session.id === threadId)
        : undefined;
      return row === undefined ? null : { name, row };
    }))).filter((match): match is { name: string; row: HermesSessionSummary } => match !== null);

    if (matches.length === 0) {
      // Lazy named sessions intentionally have neither a durable history row
      // nor list visibility until their first message. Resume is the only
      // authoritative existence check on older Hermes gateways.
      for (const profile of profiles) {
        const name = profile.name.trim() || "default";
        let payload: HermesSessionPayload;
        try {
          payload = await this.gateway.call<HermesSessionPayload>("session.resume", {
            session_id: threadId,
            defer_history: true,
            omit_messages: true,
            profile: name,
          });
        } catch (error) {
          if (isSessionNotFound(error)) continue;
          throw error;
        }
        this.bindSession(threadId, payload, name);
        return name;
      }
      throw new Error(`Hermes session not found: ${threadId}`);
    }
    if (matches.length > 1) throw new Error(`Hermes session identity is ambiguous across Profiles: ${threadId}`);
    const match = matches[0]!;
    this.profileByStored.set(threadId, match.name);
    return match.name;
  }

  private async ensureLive(storedId: string, requestedProfile?: string | null): Promise<string> {
    return this.liveByStored.get(storedId) ?? (await this.resume(storedId, requestedProfile)).session_id;
  }

  private async applyModelSelection(
    storedId: string,
    liveId: string,
    requestedModel: unknown,
  ): Promise<void> {
    const selection = decodeHermesModelSelection(requestedModel);
    if (selection === null) return;
    const current = this.payloadByStored.get(storedId)?.info;
    if (
      current?.model === selection.model &&
      (selection.provider === null || current.provider === selection.provider)
    ) {
      return;
    }
    const result = await this.gateway.call<{
      value?: string;
      confirm_required?: boolean;
      confirm_message?: string;
    }>("config.set", {
      session_id: liveId,
      key: "model",
      value: hermesModelSwitchArgument(selection),
      // Selecting a concrete row in OpenCraft is already an explicit user action.
      confirm_expensive_model: true,
    });
    if (result.confirm_required === true) {
      throw new Error(result.confirm_message || "Hermes requires confirmation for this model");
    }
    const payload = this.payloadByStored.get(storedId);
    if (payload !== undefined) {
      payload.info = {
        ...payload.info,
        model: result.value?.trim() || selection.model,
        ...(selection.provider === null ? {} : { provider: selection.provider }),
      };
    }
  }

  private async resume(storedId: string, requestedProfile?: string | null): Promise<HermesSessionPayload> {
    let payload = this.payloadByStored.get(storedId);
    if (payload === undefined) {
      const profile = requestedProfile?.trim() || this.profileByStored.get(storedId) || null;
      payload = await this.gateway.call<HermesSessionPayload>("session.resume", {
        session_id: storedId,
        defer_history: true,
        omit_messages: true,
        ...(profile === null ? {} : { profile }),
      });
      this.bindSession(storedId, payload, profile ?? "default");
    }
    return payload;
  }

  private bindSession(storedId: string, payload: HermesSessionPayload, profile: string): void {
    const previousLive = this.liveByStored.get(storedId);
    if (previousLive !== undefined && previousLive !== payload.session_id) {
      this.storedByLive.delete(previousLive);
      const owner = this.activeByLive.get(previousLive);
      if (owner !== undefined) {
        this.activeByLive.delete(previousLive);
        this.activeByLive.set(payload.session_id, owner);
        this.clearSettlementTimer(previousLive);
        this.scheduleDeferredSettlement(payload.session_id, owner);
      }
      const pending = this.pendingByLive.get(previousLive);
      if (pending !== undefined) {
        this.pendingByLive.delete(previousLive);
        this.pendingByLive.set(payload.session_id, pending);
      }
      if (this.queuedBoundaryPendingByLive.delete(previousLive)) {
        this.queuedBoundaryPendingByLive.add(payload.session_id);
      }
    }
    this.liveByStored.set(storedId, payload.session_id);
    this.storedByLive.set(payload.session_id, storedId);
    this.payloadByStored.set(storedId, payload);
    this.profileByStored.set(storedId, profile);
  }

  private emit(method: string, params: unknown): void {
    for (const listener of this.notificationListeners) listener(method, params);
  }

  private emitQueueChanged(threadId: string): void {
    this.emit("thread/queue/changed", { threadId });
  }

  private emitProjection(notifications: ReturnType<HermesTurnEventStateMachine["project"]>): void {
    for (const notification of notifications) this.emit(notification.method, notification.params);
  }

  private clearSettlementTimer(live: string): void {
    const handle = this.settlementTimerByLive.get(live);
    if (handle === undefined) return;
    this.projectionScheduler.cancel(handle);
    this.settlementTimerByLive.delete(live);
  }

  private scheduleDeferredSettlement(live: string, projection: HermesTurnEventStateMachine): void {
    this.clearSettlementTimer(live);
    const settleAtMs = projection.deferredSettlementAtMs;
    if (settleAtMs === null || projection.isCompleted) return;
    const handle = this.projectionScheduler.schedule(() => {
      this.settlementTimerByLive.delete(live);
      if (this.activeByLive.get(live) !== projection) return;
      const completedBefore = projection.isCompleted;
      this.emitProjection(projection.settleDeferredSessionInfo(this.projectionScheduler.now()));
      if (!completedBefore && projection.isCompleted) {
        const threadId = this.storedByLive.get(live);
        if (threadId !== undefined) this.drainQueue(threadId);
      }
    }, Math.max(0, settleAtMs - this.projectionScheduler.now()));
    this.settlementTimerByLive.set(live, handle);
  }

  private promotePendingProjection(live: string): HermesTurnEventStateMachine | undefined {
    const pending = this.pendingByLive.get(live);
    const next = pending?.shift();
    if (pending !== undefined && pending.length === 0) this.pendingByLive.delete(live);
    if (next !== undefined) this.activeByLive.set(live, next);
    return next;
  }

  private drainQueue(threadId: string): void {
    if ((this.queuedByStored.get(threadId)?.length ?? 0) === 0) return;
    queueMicrotask(() => {
      void this.startQueuedSubmission(threadId).catch((error) => {
        this.emit("error", {
          error: { message: error instanceof Error ? error.message : String(error) },
          threadId,
        });
      });
    });
  }

  private projectGatewayEvent(event: Record<string, unknown>): void {
    const live = typeof event.session_id === "string" ? event.session_id : "";
    const threadId = this.storedByLive.get(live);
    if (threadId === undefined) return;
    const occurredAtMs = this.projectionScheduler.now();
    const payload = this.payloadByStored.get(threadId);
    if (payload !== undefined) {
      if (event.type === "message.start") payload.running = true;
      if (event.type === "message.complete" || event.type === "error") payload.running = false;
    }
    if (event.type === "session.info" && typeof event.payload === "object" && event.payload !== null) {
      if (payload !== undefined) {
        const info = event.payload as Record<string, unknown>;
        if (typeof info.running === "boolean") payload.running = info.running;
        payload.info = {
          ...payload.info,
          ...info,
        };
      }
      if ((event.payload as Record<string, unknown>).running === false) {
        this.queuedBoundaryPendingByLive.delete(live);
      }
    }
    const admission = this.admissionByLive.get(live);
    if (admission !== undefined) {
      admission.events.push({ event: structuredClone(event), occurredAtMs });
      return;
    }
    let projection = this.activeByLive.get(live);
    if (
      event.type === "message.start"
      && (projection === undefined || projection.isCompleted)
      && !this.queuedBoundaryPendingByLive.has(live)
    ) {
      this.clearSettlementTimer(live);
      projection = this.promotePendingProjection(live);
    }
    if (projection === undefined) return;
    this.projectEventIntoOwner(live, projection, event, occurredAtMs);
  }

  private projectEventIntoOwner(
    live: string,
    projection: HermesTurnEventStateMachine,
    event: Record<string, unknown>,
    occurredAtMs: number,
  ): void {
    const threadId = this.storedByLive.get(live);
    if (threadId === undefined) return;
    const completedBeforeEvent = projection.isCompleted;
    this.emitProjection(projection.project(event, occurredAtMs));
    this.scheduleDeferredSettlement(live, projection);
    if (!completedBeforeEvent && projection.isCompleted) {
      this.clearSettlementTimer(live);
      // Keep the settled owner until Draft promotion / Resume has crossed its
      // replay barrier. `startTurn` may replace it immediately for an already
      // active Conversation, so this does not block the next user command.
      this.drainQueue(threadId);
    }
  }
}
