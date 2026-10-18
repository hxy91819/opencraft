import type { BrowserViewportLayout } from "@opencraft/browser-core";

export interface PresentationState {
  readonly mountGeneration?: number;
  readonly isVisible: boolean;
  readonly bounds: BrowserViewportLayout["visualBounds"] | null;
  readonly layout?: BrowserViewportLayout;
  readonly shouldBootstrap?: boolean;
  readonly shouldPaint?: boolean;
  readonly scale?: number;
  readonly windowZoom?: number;
}

export interface SwitchHost {
  getConversationId(): string;
  getMountGeneration(): number;
  isPainted(): boolean;
  isConnected(): boolean;
  sync(state: PresentationState, reference: object): void;
  stage(state: PresentationState, reference: object): void;
  reveal(reference: object, blocked: boolean): void;
  finishReveal(): void;
  detach(reference: object, generation: number): void;
  releaseRef(reference: object, generation: number): void;
  blockInteraction(): void;
  restoreInteraction(): void;
  placeImmediatelyBehind(host: SwitchHost): void;
  expandToCoverStagedBounds(bounds: NonNullable<PresentationState["bounds"]>): void;
  clearStagedCoverBounds(): void;
  listenForDidRegister(callback: () => void): () => void;
}

interface Attachment {
  readonly host: SwitchHost;
  readonly reference: object;
  readonly generation: number;
}
interface Replacement {
  incoming: Attachment;
  readonly outgoing: Attachment;
  readonly lifetime: AbortController;
  phase: "waiting" | "warming" | "committed";
}
interface Slot {
  painted: Attachment | null;
  replacement: Replacement | null;
}

/** Owns physical panel replacements, independently of logical page lifetime.
 * Each replacement has one cancellation scope; queued work must still own its
 * slot before it may reveal, detach, or restore interaction. */
export class BrowserPresentationSwitch {
  private readonly slots = new Map<string, Slot>();
  private readonly acknowledgements = new WeakMap<SwitchHost, number>();
  private disposed = false;

  sync(host: SwitchHost, state: PresentationState, reference: object, surface: string): void {
    if (this.disposed) return;
    const attachment = { host, reference, generation: state.mountGeneration ?? host.getMountGeneration() };
    if (surface === "hidden-browser-use") {
      host.sync(state, reference);
      return;
    }
    const slot = this.slot(surface);
    if (!state.isVisible || !state.bounds || state.shouldBootstrap || state.shouldPaint === false) {
      if (slot.replacement && this.involves(slot.replacement, host)) this.cancel(slot, true);
      host.sync(state, reference);
      if (slot.painted?.host === host && !host.isPainted()) slot.painted = null;
      return;
    }
    const pending = slot.replacement;
    if (pending?.incoming.host === host && pending.incoming.generation === attachment.generation) {
      pending.incoming = attachment;
      if (pending.phase === "committed") host.sync(state, reference);
      else this.stage(pending, state);
      return;
    }
    if (pending) {
      if (pending.phase === "committed") this.complete(slot, pending);
      else this.cancel(slot, false);
    }
    const previous = slot.painted;
    const replace = previous && previous.host !== host && previous.host.isPainted()
      && previous.host.getConversationId() === host.getConversationId();
    if (replace) {
      const transaction: Replacement = {
        incoming: attachment, outgoing: previous,
        lifetime: new AbortController(), phase: "waiting",
      };
      slot.replacement = transaction;
      previous.host.blockInteraction();
      const remove = host.listenForDidRegister(() => {
        if (slot.replacement === transaction) host.placeImmediatelyBehind(previous.host);
      });
      transaction.lifetime.signal.addEventListener("abort", remove, { once: true });
      this.stage(transaction, state);
      this.timeout(transaction, () => this.warm(slot, transaction), 100);
      if (this.acknowledgements.get(host) === attachment.generation) {
        this.acknowledgements.delete(host);
        this.warm(slot, transaction);
      }
    } else {
      host.sync(state, reference);
      slot.painted = host.isPainted() ? attachment : null;
    }
  }

  acknowledgeAttachment(host: SwitchHost | null, generation: number, current: number): void {
    if (!host || generation !== current || this.disposed) return;
    for (const slot of this.slots.values()) {
      const pending = slot.replacement;
      if (pending?.incoming.host === host && pending.incoming.generation === generation) {
        this.warm(slot, pending);
        return;
      }
    }
    this.acknowledgements.set(host, generation);
  }

  detach(host: SwitchHost, reference: object, surface: string, generation: number): void {
    const slot = this.slots.get(surface);
    const pending = slot?.replacement;
    if (pending?.outgoing.host === host) {
      host.releaseRef(reference, generation);
      return;
    }
    if (pending?.incoming.host === host && pending.incoming.generation === generation) {
      this.cancel(slot!, true);
      return;
    }
    host.detach(reference, generation);
    if (slot?.painted?.host === host && slot.painted.generation === generation) slot.painted = null;
  }

  removeTab(host: SwitchHost): void { this.removeHost(host); }
  disposeHost(host: SwitchHost): void { this.removeHost(host); }
  disposeAll(): void {
    this.disposed = true;
    for (const slot of this.slots.values()) {
      this.cancel(slot, true);
      if (slot.painted) this.detachAttachment(slot.painted);
    }
    this.slots.clear();
  }

  private slot(surface: string): Slot {
    let slot = this.slots.get(surface);
    if (!slot) { slot = { painted: null, replacement: null }; this.slots.set(surface, slot); }
    return slot;
  }
  private involves(pending: Replacement, host: SwitchHost): boolean {
    return pending.incoming.host === host || pending.outgoing.host === host;
  }
  private removeHost(host: SwitchHost): void {
    this.acknowledgements.delete(host);
    for (const slot of this.slots.values()) {
      const pending = slot.replacement;
      if (pending?.outgoing.host === host) {
        this.complete(slot, pending);
      } else if (pending?.incoming.host === host) this.cancel(slot, false);
      if (slot.painted?.host === host) {
        this.detachAttachment(slot.painted);
        slot.painted = null;
      }
    }
  }
  private stage(pending: Replacement, state: PresentationState): void {
    const { incoming, outgoing } = pending;
    incoming.host.stage(state, incoming.reference);
    if (state.bounds) outgoing.host.expandToCoverStagedBounds(state.bounds);
    incoming.host.placeImmediatelyBehind(outgoing.host);
    incoming.host.reveal(incoming.reference, true);
    incoming.host.placeImmediatelyBehind(outgoing.host);
  }
  private warm(slot: Slot, pending: Replacement): void {
    if (slot.replacement !== pending || pending.phase !== "waiting") return;
    pending.phase = "warming";
    this.frame(pending, () => this.frame(pending, () => {
      if (slot.replacement !== pending) return;
      pending.phase = "committed";
      slot.painted = pending.incoming;
      pending.incoming.host.reveal(pending.incoming.reference, true);
      this.frame(pending, () => this.complete(slot, pending));
    }));
  }
  private complete(slot: Slot, pending: Replacement): void {
    if (slot.replacement !== pending) return;
    slot.replacement = null;
    pending.lifetime.abort();
    this.detachAttachment(pending.outgoing);
    slot.painted = pending.incoming;
    pending.incoming.host.reveal(pending.incoming.reference, true);
    pending.incoming.host.finishReveal();
  }
  private cancel(slot: Slot, detachOutgoing: boolean): void {
    const pending = slot.replacement;
    if (!pending) return;
    slot.replacement = null;
    pending.lifetime.abort();
    this.acknowledgements.delete(pending.incoming.host);
    this.detachAttachment(pending.incoming);
    slot.painted = null;
    if (detachOutgoing) this.detachAttachment(pending.outgoing);
    else if (pending.outgoing.host.isConnected()) {
      pending.outgoing.host.clearStagedCoverBounds();
      pending.outgoing.host.restoreInteraction();
      slot.painted = pending.outgoing;
    }
  }
  private detachAttachment(value: Attachment): void { value.host.detach(value.reference, value.generation); }
  private frame(pending: Replacement, action: () => void): void {
    const signal = pending.lifetime.signal;
    if (signal.aborted) return;
    const cancel = () => window.cancelAnimationFrame(id);
    const id = window.requestAnimationFrame(() => {
      signal.removeEventListener("abort", cancel);
      if (!signal.aborted) action();
    });
    signal.addEventListener("abort", cancel, { once: true });
  }
  private timeout(pending: Replacement, action: () => void, delay: number): void {
    const signal = pending.lifetime.signal;
    const cancel = () => window.clearTimeout(id);
    const id = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      if (!signal.aborted) action();
    }, delay);
    signal.addEventListener("abort", cancel, { once: true });
  }
}
