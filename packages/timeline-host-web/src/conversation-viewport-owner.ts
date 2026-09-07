import {
  invertedWebScrollTopForDistance,
  normalizeInvertedWebViewportMetrics,
  TurnScrollController,
  type TurnScrollControllerSnapshot,
} from "@opencraft/timeline-virtualizer";

import { preserveTimelineElementPositionOnReflow } from "./reflow";
import {
  observeBorderBoxHeight,
  resizeObserverBlockSize,
} from "./measurement";

export interface WebConversationScrollPortListeners {
  readonly keydown?: (event: KeyboardEvent) => void;
  readonly pointercancel?: (event: PointerEvent) => void;
  readonly pointerdown?: (event: PointerEvent) => void;
  readonly pointerup?: (event: PointerEvent) => void;
  readonly scroll?: (event: Event) => void;
  readonly touchcancel?: (event: TouchEvent) => void;
  readonly touchend?: (event: TouchEvent) => void;
  readonly touchmove?: (event: TouchEvent) => void;
  readonly touchstart?: (event: TouchEvent) => void;
  readonly wheel?: (event: WheelEvent) => void;
}

export interface WebConversationTurnMeasurement {
  readonly turnKey: string;
  readonly heightPx: number;
}

export interface WebConversationMeasurementBatch {
  /** Invalidates asynchronous work from an earlier viewport lifetime. */
  readonly generation: number;
  readonly measurements: readonly WebConversationTurnMeasurement[];
  readonly source:
    | { readonly kind: "resize-observer" }
    | {
        readonly kind: "renderer";
        readonly requests: readonly WebConversationLayoutInvalidation[];
      };
}

export interface WebConversationLayoutInvalidation {
  readonly documentId: string;
  readonly generation: number;
  readonly geometryChanged: boolean;
  readonly reason: string;
}

export function shouldAcceptWebConversationInvalidation(
  latestGeneration: number | undefined,
  request: WebConversationLayoutInvalidation,
): boolean {
  return request.geometryChanged && request.generation >= (latestGeneration ?? 0);
}

export type WebConversationMeasurementListener = (
  batch: WebConversationMeasurementBatch,
) => void;

/**
 * Sole DOM owner for one mounted Web conversation viewport.
 *
 * React owns projection state; this owner owns platform resources: the
 * scrollport, Turn elements, ResizeObserver, reflow anchors and the platform
 * TurnScrollController. No renderer is allowed to construct a competing DOM
 * observer for the same Turn rows.
 */
export class WebConversationViewportOwner {
  readonly scrollElementRef: { current: HTMLDivElement | null } = { current: null };
  readonly turnElementsRef: { current: Map<string, HTMLDivElement> } = {
    current: new Map(),
  };
  readonly scrollController: TurnScrollController;

  private measurementListener: WebConversationMeasurementListener | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private generation = 1;
  private disposed = false;
  private measurementFrame: number | null = null;
  private readonly pendingInvalidations = new Map<string, WebConversationLayoutInvalidation>();
  private readonly latestDocumentGenerations = new Map<string, number>();
  private readonly platformResources = new Set<() => void>();

  constructor(initialDistanceFromBottomPx: number) {
    this.scrollController = new TurnScrollController({
      getMetrics: () => {
        const element = this.scrollElementRef.current;
        return element === null
          ? {
              distanceFromBottomPx: Math.max(0, initialDistanceFromBottomPx),
              viewportHeightPx: 0,
              scrollHeightPx: 0,
            }
          : normalizeInvertedWebViewportMetrics({
              contentHeightPx: element.scrollHeight,
              viewportHeightPx: element.clientHeight,
              scrollTopPx: element.scrollTop,
            });
      },
      writeDistanceFromBottomPx: (distance, behavior) => {
        const element = this.scrollElementRef.current;
        if (element === null) return;
        element.scrollTo({
          behavior: behavior === "smooth" ? "smooth" : "instant",
          top: invertedWebScrollTopForDistance(distance),
        });
      },
      now: () => performance.now(),
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
    }, initialDistanceFromBottomPx);
  }

  readonly attachScrollElement = (element: HTMLDivElement | null): void => {
    if (this.disposed) return;
    this.scrollElementRef.current = element;
  };

  setMeasurementListener(listener: WebConversationMeasurementListener | null): void {
    if (this.disposed) return;
    this.measurementListener = listener;
  }

  /** Coalesces renderer requests into one measured layout transaction per frame. */
  readonly requestLayoutMeasurement = (
    request: WebConversationLayoutInvalidation,
  ): void => {
    if (this.disposed) return;
    const latest = this.latestDocumentGenerations.get(request.documentId) ?? 0;
    if (request.generation < latest) return;
    if (request.generation > latest) {
      this.latestDocumentGenerations.set(request.documentId, request.generation);
      const pending = this.pendingInvalidations.get(request.documentId);
      if (pending !== undefined && pending.generation < request.generation) {
        this.pendingInvalidations.delete(request.documentId);
      }
    }
    // Even a paint-only request advances the document generation fence. It
    // must be able to invalidate an older queued geometry request without
    // forcing a redundant Turn measurement of its own.
    if (!request.geometryChanged) return;
    this.pendingInvalidations.set(request.documentId, request);
    if (this.measurementFrame !== null) return;
    this.measurementFrame = window.requestAnimationFrame(() => {
      this.measurementFrame = null;
      if (this.disposed || this.pendingInvalidations.size === 0) return;
      const requests = [...this.pendingInvalidations.values()];
      this.pendingInvalidations.clear();
      const measurements = Object.entries(this.measureMountedTurns()).map(
        ([turnKey, heightPx]) => ({ turnKey, heightPx }),
      );
      if (measurements.length === 0) return;
      this.measurementListener?.({
        generation: this.generation,
        measurements,
        source: { kind: "renderer", requests },
      });
    });
  };

  readonly observeTurn = (turnKey: string, element: HTMLDivElement | null): void => {
    if (this.disposed) return;
    const previous = this.turnElementsRef.current.get(turnKey);
    if (previous === element) return;
    if (previous !== undefined) {
      this.resizeObserver?.unobserve(previous);
      this.turnElementsRef.current.delete(turnKey);
    }
    if (element === null) return;
    element.dataset.virtualizedTurnKey = turnKey;
    this.turnElementsRef.current.set(turnKey, element);
    this.ensureResizeObserver().observe(element, { box: "border-box" });
  }

  bindScrollPortListeners(listeners: WebConversationScrollPortListeners): () => void {
    const element = this.scrollElementRef.current;
    if (element === null || this.disposed) return () => undefined;
    const abortController = new AbortController();
    const options: AddEventListenerOptions = {
      passive: true,
      signal: abortController.signal,
    };
    for (const [type, listener] of Object.entries(listeners)) {
      if (listener !== undefined) element.addEventListener(type, listener as EventListener, options);
    }
    return this.ownPlatformResource(() => abortController.abort());
  }

  observeViewportGeometry(onChange: () => void): () => void {
    const element = this.scrollElementRef.current;
    if (element === null || this.disposed) return () => undefined;
    let frame: number | null = null;
    let previousClientHeightPx: number | null = null;
    let previousScrollHeightPx: number | null = null;
    const update = () => {
      frame ??= window.requestAnimationFrame(() => {
        frame = null;
        const clientHeightPx = element.clientHeight;
        const scrollHeightPx = element.scrollHeight;
        if (
          clientHeightPx <= 0
          || (
            previousClientHeightPx === clientHeightPx
            && previousScrollHeightPx === scrollHeightPx
          )
        ) return;
        previousClientHeightPx = clientHeightPx;
        previousScrollHeightPx = scrollHeightPx;
        onChange();
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild !== null) observer.observe(element.firstElementChild);
    window.addEventListener("resize", update, { passive: true });
    return this.ownPlatformResource(() => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      if (frame !== null) window.cancelAnimationFrame(frame);
    });
  }

  observeFooterHeight(element: HTMLElement, onHeight: (heightPx: number) => void): () => void {
    if (this.disposed) return () => undefined;
    return this.ownPlatformResource(observeBorderBoxHeight(element, onHeight));
  }

  observeResponseSpacer(
    spacer: Element,
    onIntersection: (record: IntersectionObserverEntry) => void,
  ): () => void {
    const root = this.scrollElementRef.current;
    if (root === null || this.disposed || typeof IntersectionObserver === "undefined") {
      return () => undefined;
    }
    const observer = new IntersectionObserver((records) => {
      const record = records.at(-1);
      if (record !== undefined) onIntersection(record);
    }, {
      root,
      threshold: Array.from({ length: 101 }, (_, index) => index / 100),
    });
    observer.observe(spacer);
    return this.ownPlatformResource(() => observer.disconnect());
  }

  getTurnElement(turnKey: string): HTMLDivElement | null {
    return this.turnElementsRef.current.get(turnKey) ?? null;
  }

  measureMountedTurns(): Readonly<Record<string, number>> {
    const measurements: Record<string, number> = {};
    for (const [turnKey, element] of this.turnElementsRef.current) {
      const height = element.offsetHeight;
      if (height > 0) measurements[turnKey] = height;
    }
    return measurements;
  }

  captureReflowAnchor(target: EventTarget | null): void {
    const scrollElement = this.scrollElementRef.current;
    if (scrollElement === null || !(target instanceof HTMLElement)) return;
    const anchor = target.closest<HTMLElement>(
      "[aria-expanded], [data-timeline-preserve-on-reflow='true']",
    );
    if (
      anchor === null
      || anchor.closest("[data-thread-user-message-navigation-content='true']") === null
    ) return;
    preserveTimelineElementPositionOnReflow(anchor, scrollElement);
  }

  getScrollSnapshot(): TurnScrollControllerSnapshot {
    return this.scrollController.getSnapshot();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.measurementListener = null;
    if (this.measurementFrame !== null) window.cancelAnimationFrame(this.measurementFrame);
    this.measurementFrame = null;
    this.pendingInvalidations.clear();
    this.latestDocumentGenerations.clear();
    for (const dispose of [...this.platformResources]) dispose();
    this.platformResources.clear();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.turnElementsRef.current.clear();
    this.scrollElementRef.current = null;
    this.scrollController.dispose();
  }

  private ensureResizeObserver(): ResizeObserver {
    if (this.resizeObserver !== null) return this.resizeObserver;
    this.resizeObserver = new ResizeObserver((records) => {
      if (this.disposed) return;
      const measurements: WebConversationTurnMeasurement[] = [];
      for (const record of records) {
        const key = (record.target as HTMLElement).dataset.virtualizedTurnKey;
        if (
          key === undefined
          || this.turnElementsRef.current.get(key) !== record.target
        ) continue;
        measurements.push({
          turnKey: key,
          heightPx: Math.max(1, resizeObserverBlockSize(record)),
        });
      }
      if (measurements.length === 0) return;
      this.measurementListener?.({
        generation: this.generation,
        measurements,
        source: { kind: "resize-observer" },
      });
    });
    return this.resizeObserver;
  }

  private ownPlatformResource(disposeResource: () => void): () => void {
    let active = true;
    const dispose = () => {
      if (!active) return;
      active = false;
      this.platformResources.delete(dispose);
      disposeResource();
    };
    this.platformResources.add(dispose);
    return dispose;
  }
}

export function createWebConversationViewportOwner(
  initialDistanceFromBottomPx: number,
): WebConversationViewportOwner {
  return new WebConversationViewportOwner(initialDistanceFromBottomPx);
}
