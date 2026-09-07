import type { AppServerThreadItem, AppServerTurn } from "./types";

export interface HermesProjectionNotification {
  readonly method: string;
  readonly params: Record<string, unknown>;
}

type TurnPhase = "accepted" | "thinking" | "reasoning" | "tool" | "composing" | "completed";

const PRE_TURN_LIVE_SETTLE_GRACE_MS = 15_000;

interface DeferredIdleSettlement {
  readonly payload: Record<string, unknown>;
  readonly settleAtMs: number;
}

interface TextItemState {
  readonly id: string;
  text: string;
  started: boolean;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.flatMap((part) => {
    if (typeof part === "string") return [part];
    const object = record(part);
    return typeof object.text === "string" ? [object.text] : [];
  }).join("\n");
}

function eventText(payload: Record<string, unknown>): string {
  return text(payload.text ?? payload.reasoning ?? payload.content ?? payload.message);
}

function statusFor(payload: Record<string, unknown>): AppServerTurn["status"] {
  if (payload.status === "interrupted" || payload.status === "cancelled" || payload.status === "canceled") return "interrupted";
  if (payload.status === "error" || payload.status === "failed" || payload.error !== undefined) return "failed";
  return "completed";
}

/**
 * Owns the semantic projection of one live Hermes Turn.
 *
 * Hermes emits transport events; AppServer exposes a durable Turn/Item model.
 * Keeping that translation here makes event ordering, replay idempotency and
 * segment ownership explicit instead of spreading them across UI code.
 */
export class HermesTurnEventStateMachine {
  private phase: TurnPhase = "accepted";
  private turnStarted = false;
  private turnLive = false;
  private acceptedAtMs: number | null = null;
  private completed = false;
  private deferredIdleSettlement: DeferredIdleSettlement | null = null;
  private segmentSequence = 0;
  private reasoningSequence = 0;
  private assistant: TextItemState | null = null;
  /**
   * The last `message.interim` Item is still the completion target until a
   * real semantic boundary (reasoning or a tool call) supersedes it.
   *
   * Hermes Desktop keeps this ownership on the message itself (`interim`),
   * rather than in a volatile session flag that `message.start` can reset.
   */
  private interimAssistant: TextItemState | null = null;
  private reasoning: TextItemState | null = null;
  private readonly tools = new Map<string, AppServerThreadItem>();

  constructor(
    readonly threadId: string,
    readonly turn: AppServerTurn,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {
    const lastItem = turn.items.at(-1);
    const lastAssistant = [...turn.items].reverse().find((item) => item.type === "agentMessage");
    if (lastAssistant !== undefined && lastAssistant.phase !== "commentary") {
      this.assistant = {
        id: lastAssistant.id,
        text: typeof lastAssistant.text === "string" ? lastAssistant.text : "",
        started: true,
      };
    } else if (lastItem?.type === "agentMessage" && lastItem.phase === "commentary") {
      // An active replay can resume after an interim preview but before its
      // authoritative completion. Preserve that Item as the completion target.
      this.interimAssistant = {
        id: lastItem.id,
        text: typeof lastItem.text === "string" ? lastItem.text : "",
        started: true,
      };
    }
    const lastReasoning = [...turn.items].reverse().find((item) => item.type === "reasoning");
    if (lastReasoning !== undefined) {
      this.reasoning = {
        id: lastReasoning.id,
        text: text(lastReasoning.content),
        started: true,
      };
    }
    for (const item of turn.items) {
      if (item.type === "dynamicToolCall") this.tools.set(item.id, item);
    }
  }

  get currentPhase(): TurnPhase {
    return this.phase;
  }

  get isCompleted(): boolean {
    return this.completed;
  }

  /**
   * An idle heartbeat can race prompt admission before Hermes publishes the
   * first live frame. Ignoring it forever leaks a running Turn; treating it as
   * terminal immediately makes the Turn flash completed. The adapter owns the
   * clock and schedules this explicit convergence deadline.
   */
  get deferredSettlementAtMs(): number | null {
    return this.deferredIdleSettlement?.settleAtMs ?? null;
  }

  accept(startedAtMs = Date.now()): HermesProjectionNotification[] {
    if (this.turnStarted || this.completed) return [];
    this.turnStarted = true;
    this.acceptedAtMs = startedAtMs;
    this.turn.status = "inProgress";
    if (this.turn.startedAt === null) this.turn.startedAt = Math.floor(startedAtMs / 1_000);
    return [this.notification("turn/started", { turn: structuredClone(this.turn) })];
  }

  project(event: Record<string, unknown>, occurredAtMs = Date.now()): HermesProjectionNotification[] {
    if (this.completed) return [];
    const type = typeof event.type === "string" ? event.type : "";
    const payload = record(event.payload);
    const output = this.accept(occurredAtMs);

    if (
      type === "message.start"
      || type === "message.delta"
      || type === "message.interim"
      || type === "message.complete"
      || type === "reasoning.delta"
      || type === "reasoning.available"
      || type === "tool.start"
      || type === "tool.progress"
      || type === "tool.complete"
      || (type === "session.info" && payload.running === true)
    ) {
      this.turnLive = true;
      this.deferredIdleSettlement = null;
    }

    switch (type) {
      case "message.start":
        this.phase = "thinking";
        break;
      case "thinking.delta":
        // These frames commonly contain spinner/status copy. The active Turn is
        // enough for the renderer to show Thinking; do not fabricate reasoning.
        this.phase = "thinking";
        break;
      case "reasoning.delta":
        this.sealInterimAssistant();
        this.completeAssistant(output, "commentary");
        this.phase = "reasoning";
        this.appendReasoning(eventText(payload), output, occurredAtMs);
        break;
      case "reasoning.available":
        this.sealInterimAssistant();
        this.completeAssistant(output, "commentary");
        this.phase = "reasoning";
        this.reconcileReasoning(eventText(payload), output, occurredAtMs);
        break;
      case "message.delta":
        this.completeReasoning(output);
        this.phase = "composing";
        this.appendAssistant(eventText(payload), output, occurredAtMs);
        break;
      case "message.interim":
        this.completeReasoning(output);
        this.phase = "composing";
        this.reconcileAssistant(eventText(payload), output, occurredAtMs);
        this.completeAssistant(output, "commentary", true);
        this.phase = "thinking";
        break;
      case "tool.start":
        this.sealInterimAssistant();
        this.completeReasoning(output);
        this.completeAssistant(output, "commentary");
        this.phase = "tool";
        this.startTool(payload, output, occurredAtMs);
        break;
      case "tool.generating":
        // Hermes announces only a tool name while its argument JSON is still
        // being drafted. There is no stable Item identity yet.
        this.phase = "tool";
        break;
      case "tool.progress":
        this.sealInterimAssistant();
        this.completeReasoning(output);
        this.completeAssistant(output, "commentary");
        this.phase = "tool";
        this.progressTool(payload, output, occurredAtMs);
        break;
      case "tool.complete":
        this.phase = "tool";
        this.completeTool(payload, output, occurredAtMs);
        if (![...this.tools.values()].some((item) => item.status === "inProgress")) this.phase = "thinking";
        break;
      case "message.complete":
        this.completeReasoning(output);
        this.completeFinalAssistant(eventText(payload), output, occurredAtMs);
        this.finish(statusFor(payload), payload, output, occurredAtMs);
        break;
      case "session.info":
        if (payload.running === true) {
          this.phase = "thinking";
        } else if (payload.running === false && this.maySettleFromSessionInfo(occurredAtMs)) {
          this.settleFromSessionInfo(payload, output, occurredAtMs);
        } else if (payload.running === false && this.acceptedAtMs !== null) {
          this.deferredIdleSettlement = {
            payload: structuredClone(payload),
            settleAtMs: this.acceptedAtMs + PRE_TURN_LIVE_SETTLE_GRACE_MS,
          };
        }
        break;
      case "error":
        this.completeReasoning(output);
        this.completeAssistant(output, null);
        this.finish("failed", payload, output, occurredAtMs);
        break;
      default:
        break;
    }
    return output;
  }

  settleDeferredSessionInfo(occurredAtMs = Date.now()): HermesProjectionNotification[] {
    const pending = this.deferredIdleSettlement;
    if (pending === null || this.completed || this.turnLive || occurredAtMs < pending.settleAtMs) return [];
    this.deferredIdleSettlement = null;
    const output: HermesProjectionNotification[] = [];
    this.settleFromSessionInfo(pending.payload, output, occurredAtMs);
    return output;
  }

  private settleFromSessionInfo(
    payload: Record<string, unknown>,
    output: HermesProjectionNotification[],
    occurredAtMs: number,
  ): void {
    this.completeReasoning(output);
    this.completeFinalAssistant("", output, occurredAtMs);
    this.finish(statusFor(payload), payload, output, occurredAtMs);
  }

  private notification(method: string, params: Record<string, unknown>): HermesProjectionNotification {
    return { method, params: { threadId: this.threadId, ...params } };
  }

  private upsertItem(item: AppServerThreadItem): void {
    const index = this.turn.items.findIndex(({ id }) => id === item.id);
    if (index < 0) this.turn.items.push(item);
    else this.turn.items[index] = item;
  }

  private newAssistant(): TextItemState {
    this.segmentSequence += 1;
    return { id: `hermes-agent-${this.turn.id}-${this.segmentSequence}-${this.createId()}`, text: "", started: false };
  }

  private ensureAssistant(output: HermesProjectionNotification[], occurredAtMs: number): TextItemState {
    const state = this.assistant ?? (this.assistant = this.newAssistant());
    if (!state.started) {
      state.started = true;
      const item = { type: "agentMessage", id: state.id, text: state.text, phase: null, memoryCitation: null };
      this.upsertItem(item);
      output.push(this.notification("item/started", { turnId: this.turn.id, item, startedAtMs: occurredAtMs }));
    }
    return state;
  }

  private appendAssistant(delta: string, output: HermesProjectionNotification[], occurredAtMs: number): void {
    if (delta === "") return;
    const state = this.ensureAssistant(output, occurredAtMs);
    state.text += delta;
    this.upsertItem({ type: "agentMessage", id: state.id, text: state.text, phase: null, memoryCitation: null });
    output.push(this.notification("item/agentMessage/delta", { turnId: this.turn.id, itemId: state.id, delta }));
  }

  private reconcileAssistant(authoritative: string, output: HermesProjectionNotification[], occurredAtMs: number): void {
    if (authoritative === "") return;
    const state = this.ensureAssistant(output, occurredAtMs);
    if (authoritative === state.text) return;
    if (authoritative.startsWith(state.text)) {
      this.appendAssistant(authoritative.slice(state.text.length), output, occurredAtMs);
      return;
    }
    // A non-prefix authoritative payload belongs to a new final segment; do
    // not corrupt an already-rendered commentary segment with replacement text.
    this.completeAssistant(output, "commentary");
    this.appendAssistant(authoritative, output, occurredAtMs);
  }

  private completeAssistant(
    output: HermesProjectionNotification[],
    phase: "commentary" | null,
    retainsInterimOwnership = false,
  ): void {
    const state = this.assistant;
    if (state === null || !state.started) {
      this.assistant = null;
      return;
    }
    const item = { type: "agentMessage", id: state.id, text: state.text, phase, memoryCitation: null };
    this.upsertItem(item);
    output.push(this.notification("item/completed", { turnId: this.turn.id, item }));
    this.interimAssistant = phase === "commentary" && retainsInterimOwnership
      ? { ...state }
      : null;
    this.assistant = null;
  }

  private sealInterimAssistant(): void {
    this.interimAssistant = null;
  }

  /**
   * Hermes `message.complete` is authoritative state, not another message.
   * When an interim preview exists, complete that same stable Item and promote
   * it from commentary to final—even across an intervening `message.start`.
   */
  private completeFinalAssistant(
    authoritative: string,
    output: HermesProjectionNotification[],
    occurredAtMs: number,
  ): void {
    if (this.assistant !== null) {
      this.reconcileAssistant(authoritative, output, occurredAtMs);
      this.completeAssistant(output, null);
      return;
    }
    const interim = this.interimAssistant;
    if (interim !== null) {
      this.interimAssistant = null;
      if (authoritative !== "") interim.text = authoritative;
      const item = {
        type: "agentMessage",
        id: interim.id,
        text: interim.text,
        phase: null,
        memoryCitation: null,
      };
      this.upsertItem(item);
      output.push(this.notification("item/completed", { turnId: this.turn.id, item }));
      return;
    }
    this.reconcileAssistant(authoritative, output, occurredAtMs);
    this.completeAssistant(output, null);
  }

  private ensureReasoning(output: HermesProjectionNotification[], occurredAtMs: number): TextItemState {
    if (this.reasoning === null) {
      this.reasoningSequence += 1;
      this.reasoning = {
        id: `hermes-reasoning-${this.turn.id}-${this.reasoningSequence}-${this.createId()}`,
        text: "",
        started: false,
      };
    }
    if (!this.reasoning.started) {
      this.reasoning.started = true;
      const item = { type: "reasoning", id: this.reasoning.id, summary: [], content: [] };
      this.upsertItem(item);
      output.push(this.notification("item/started", { turnId: this.turn.id, item, startedAtMs: occurredAtMs }));
    }
    return this.reasoning;
  }

  private appendReasoning(delta: string, output: HermesProjectionNotification[], occurredAtMs: number): void {
    if (delta === "") return;
    const state = this.ensureReasoning(output, occurredAtMs);
    state.text += delta;
    this.upsertItem({ type: "reasoning", id: state.id, summary: [], content: [state.text] });
    output.push(this.notification("item/reasoning/textDelta", {
      turnId: this.turn.id,
      itemId: state.id,
      contentIndex: 0,
      delta,
    }));
  }

  private reconcileReasoning(authoritative: string, output: HermesProjectionNotification[], occurredAtMs: number): void {
    if (authoritative === "") return;
    const state = this.ensureReasoning(output, occurredAtMs);
    if (authoritative === state.text) return;
    if (authoritative.startsWith(state.text)) {
      this.appendReasoning(authoritative.slice(state.text.length), output, occurredAtMs);
      return;
    }
    this.completeReasoning(output);
    this.appendReasoning(authoritative, output, occurredAtMs);
  }

  private completeReasoning(output: HermesProjectionNotification[]): void {
    const state = this.reasoning;
    if (state === null || !state.started) {
      this.reasoning = null;
      return;
    }
    const item = { type: "reasoning", id: state.id, summary: [], content: state.text === "" ? [] : [state.text] };
    this.upsertItem(item);
    output.push(this.notification("item/completed", { turnId: this.turn.id, item }));
    this.reasoning = null;
  }

  private toolId(payload: Record<string, unknown>): string {
    return typeof payload.tool_id === "string" && payload.tool_id !== ""
      ? payload.tool_id
      : `hermes-tool-${this.createId()}`;
  }

  private toolItem(payload: Record<string, unknown>, id: string, status: string): AppServerThreadItem {
    const result = record(payload.result);
    const failed = status === "failed" || result.error !== undefined;
    return {
      type: "dynamicToolCall",
      id,
      namespace: "hermes",
      tool: typeof payload.name === "string" ? payload.name : "tool",
      arguments: record(payload.args),
      status: failed ? "failed" : status,
      contentItems: payload.result === undefined
        ? null
        : [{ type: "inputText", text: typeof payload.result === "string" ? payload.result : JSON.stringify(payload.result) }],
      success: status === "inProgress" ? null : !failed,
      durationMs: typeof payload.duration_s === "number" ? Math.round(payload.duration_s * 1_000) : null,
    };
  }

  private startTool(payload: Record<string, unknown>, output: HermesProjectionNotification[], occurredAtMs: number): void {
    const id = this.toolId(payload);
    if (this.tools.has(id)) return;
    const item = this.toolItem(payload, id, "inProgress");
    this.tools.set(id, item);
    this.upsertItem(item);
    output.push(this.notification("item/started", { turnId: this.turn.id, item, startedAtMs: occurredAtMs }));
  }

  private progressTool(payload: Record<string, unknown>, output: HermesProjectionNotification[], occurredAtMs: number): void {
    const id = this.toolId(payload);
    if (!this.tools.has(id)) this.startTool({ ...payload, tool_id: id }, output, occurredAtMs);
    const previous = this.tools.get(id);
    if (previous === undefined || previous.status !== "inProgress") return;
    const item = { ...previous, ...this.toolItem(payload, id, "inProgress") };
    this.tools.set(id, item);
    this.upsertItem(item);
  }

  private completeTool(payload: Record<string, unknown>, output: HermesProjectionNotification[], occurredAtMs: number): void {
    const id = this.toolId(payload);
    if (!this.tools.has(id)) this.startTool({ ...payload, tool_id: id }, output, occurredAtMs);
    if (this.tools.get(id)?.status !== "inProgress") return;
    const item = this.toolItem(payload, id, record(payload.result).error === undefined ? "completed" : "failed");
    this.tools.set(id, item);
    this.upsertItem(item);
    output.push(this.notification("item/completed", { turnId: this.turn.id, item }));
  }

  private maySettleFromSessionInfo(occurredAtMs: number): boolean {
    if (this.turnLive) return true;
    if (this.acceptedAtMs === null) return true;
    return occurredAtMs - this.acceptedAtMs >= PRE_TURN_LIVE_SETTLE_GRACE_MS;
  }

  private finish(
    status: AppServerTurn["status"],
    payload: Record<string, unknown>,
    output: HermesProjectionNotification[],
    occurredAtMs: number,
  ): void {
    if (this.completed) return;
    for (const [id, tool] of this.tools) {
      if (tool.status !== "inProgress") continue;
      const item = { ...tool, status: status === "failed" ? "failed" : "completed", success: status !== "failed" };
      this.tools.set(id, item);
      this.upsertItem(item);
      output.push(this.notification("item/completed", { turnId: this.turn.id, item }));
    }
    const completedAt = Math.floor(occurredAtMs / 1_000);
    this.turn.status = status;
    this.turn.completedAt = completedAt;
    this.turn.durationMs = this.turn.startedAt === null ? null : Math.max(0, (completedAt - this.turn.startedAt) * 1_000);
    this.turn.error = status === "failed" ? { message: String(payload.error ?? "Hermes turn failed") } : null;
    this.phase = "completed";
    this.completed = true;
    output.push(this.notification("turn/completed", { turn: structuredClone(this.turn) }));
  }
}
