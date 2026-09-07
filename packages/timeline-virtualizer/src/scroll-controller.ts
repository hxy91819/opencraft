import type {
  TurnScrollBehavior,
  TurnScrollOrigin,
  TurnViewportMetrics,
} from "./ports";
import {
  accumulatePreservedWheelDelta,
  CODEX_SCROLL_NEAR_BOTTOM_PX,
  createPreservedScrollLayout,
  normalizeInitialScrollDistance,
  restoredDistanceAfterLayout,
  scrollToBottomDistanceAtTime,
  type PreservedScrollLayout,
} from "./scroll";

export interface TurnScrollControllerHost {
  getMetrics(): TurnViewportMetrics;
  writeDistanceFromBottomPx(distanceFromBottomPx: number, behavior: TurnScrollBehavior): void;
  now(): number;
  requestFrame(callback: (nowMs: number) => void): number;
  cancelFrame(handle: number): void;
}

export interface TurnScrollControllerSnapshot extends TurnViewportMetrics {
  readonly isScrolledFromBottom: boolean;
  readonly isScrollAnimationActive: boolean;
}

type ScrollListener = (snapshot: TurnScrollControllerSnapshot) => void;
type UserScrollListener = (
  distanceFromBottomPx: number,
  previousDistanceFromBottomPx: number,
) => void;

/**
 * Platform-neutral behavioral clone of the imperative controller created by
 * Codex ThreadScrollLayout. DOM and RN hosts only translate platform metrics.
 */
export class TurnScrollController {
  readonly #host: TurnScrollControllerHost;
  readonly #listeners = new Set<ScrollListener>();
  readonly #userListeners = new Set<UserScrollListener>();
  #distanceFromBottomPx: number;
  #animationFrame: number | null = null;
  #preserveFrame: number | null = null;
  #preservedLayout: PreservedScrollLayout | null = null;
  #disposed = false;

  constructor(host: TurnScrollControllerHost, initialDistanceFromBottomPx = 0) {
    this.#host = host;
    this.#distanceFromBottomPx = normalizeInitialScrollDistance(initialDistanceFromBottomPx);
  }

  getSnapshot(): TurnScrollControllerSnapshot {
    const metrics = this.#host.getMetrics();
    return {
      ...metrics,
      distanceFromBottomPx: this.#distanceFromBottomPx,
      isScrolledFromBottom: this.#distanceFromBottomPx > CODEX_SCROLL_NEAR_BOTTOM_PX,
      isScrollAnimationActive: this.#animationFrame !== null,
    };
  }

  getLastScrollDistanceFromBottomPx(): number {
    return this.#distanceFromBottomPx;
  }

  subscribe(listener: ScrollListener): () => void {
    this.#listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.#listeners.delete(listener);
  }

  addUserScrollListener(listener: UserScrollListener): () => void {
    this.#userListeners.add(listener);
    return () => this.#userListeners.delete(listener);
  }

  reportPlatformScroll(origin: TurnScrollOrigin): TurnScrollControllerSnapshot {
    this.#restorePendingLayoutBeforeScrollEvent();
    const previous = this.#distanceFromBottomPx;
    this.#distanceFromBottomPx = Math.max(0, this.#host.getMetrics().distanceFromBottomPx);
    if (this.#distanceFromBottomPx <= CODEX_SCROLL_NEAR_BOTTOM_PX) this.cancelScrollAnimation();
    const snapshot = this.getSnapshot();
    for (const listener of this.#listeners) listener(snapshot);
    if (origin === "user" && previous !== this.#distanceFromBottomPx) {
      for (const listener of this.#userListeners) {
        listener(this.#distanceFromBottomPx, previous);
      }
    }
    return snapshot;
  }

  scrollToDistanceFromBottomPx(
    distanceFromBottomPx: number,
    behavior: TurnScrollBehavior,
    origin: TurnScrollOrigin = "system",
  ): void {
    const distance = Math.max(0, distanceFromBottomPx);
    const previous = this.#distanceFromBottomPx;
    this.#cancelPendingLayoutPreservation();
    if (distance > CODEX_SCROLL_NEAR_BOTTOM_PX) this.cancelScrollAnimation();
    this.#host.writeDistanceFromBottomPx(distance, behavior);
    this.#distanceFromBottomPx = Math.max(0, this.#host.getMetrics().distanceFromBottomPx);
    const snapshot = this.getSnapshot();
    for (const listener of this.#listeners) listener(snapshot);
    if (origin === "user") {
      for (const listener of this.#userListeners) listener(this.#distanceFromBottomPx, previous);
    }
  }

  compensateScrollToDistanceFromBottomPx(distanceFromBottomPx: number): void {
    if (this.#animationFrame !== null) return;
    this.scrollToDistanceFromBottomPx(distanceFromBottomPx, "instant");
  }

  scrollToBottom(): void {
    this.#preservedLayout = null;
    if (this.#preserveFrame !== null) {
      this.#host.cancelFrame(this.#preserveFrame);
      this.#preserveFrame = null;
    }
    const initialDistance = this.#distanceFromBottomPx;
    if (initialDistance <= CODEX_SCROLL_NEAR_BOTTOM_PX) {
      this.#host.writeDistanceFromBottomPx(0, "instant");
      this.#distanceFromBottomPx = 0;
      this.cancelScrollAnimation();
      this.#publish();
      return;
    }
    this.cancelScrollAnimation();
    const startedAtMs = this.#host.now();
    const step = (nowMs: number) => {
      if (this.#disposed) return;
      const distance = scrollToBottomDistanceAtTime(initialDistance, nowMs - startedAtMs);
      this.#host.writeDistanceFromBottomPx(distance, "instant");
      this.#distanceFromBottomPx = Math.max(0, this.#host.getMetrics().distanceFromBottomPx);
      this.#publish();
      if (distance > 0 && this.#distanceFromBottomPx > CODEX_SCROLL_NEAR_BOTTOM_PX) {
        this.#animationFrame = this.#host.requestFrame(step);
        return;
      }
      this.#animationFrame = null;
      this.#host.writeDistanceFromBottomPx(0, "instant");
      this.#distanceFromBottomPx = 0;
      this.#publish();
    };
    this.#animationFrame = this.#host.requestFrame(step);
  }

  preserveScrollPositionForNextLayout(): void {
    if (this.#animationFrame !== null || this.#preservedLayout !== null) return;
    const metrics = this.#host.getMetrics();
    const snapshot = createPreservedScrollLayout(
      this.#distanceFromBottomPx,
      metrics.scrollHeightPx,
    );
    this.#preservedLayout = snapshot;
    this.#preserveFrame = this.#host.requestFrame(() => {
      this.#preserveFrame = null;
      const preservedLayout = this.#preservedLayout;
      if (preservedLayout === null) return;
      this.#preservedLayout = null;
      const restored = restoredDistanceAfterLayout(
        preservedLayout,
        this.#host.getMetrics().scrollHeightPx,
      );
      if (restored !== null) this.scrollToDistanceFromBottomPx(restored, "instant");
    });
  }

  recordWheelDelta(deltaPx: number): void {
    if (this.#preservedLayout !== null) {
      this.#preservedLayout = accumulatePreservedWheelDelta(this.#preservedLayout, deltaPx);
    }
  }

  /** Keyboard, pointer, and touch takeover cancel Codex's pending layout restore. */
  cancelPendingLayoutPreservation(): void {
    this.#cancelPendingLayoutPreservation();
  }

  cancelScrollAnimation(): void {
    if (this.#animationFrame !== null) {
      this.#host.cancelFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
  }

  dispose(): void {
    this.#disposed = true;
    this.cancelScrollAnimation();
    if (this.#preserveFrame !== null) this.#host.cancelFrame(this.#preserveFrame);
    this.#preserveFrame = null;
    this.#preservedLayout = null;
    this.#listeners.clear();
    this.#userListeners.clear();
  }

  #publish(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }

  #restorePendingLayoutBeforeScrollEvent(): void {
    const preserved = this.#preservedLayout;
    if (
      preserved === null
      || this.#host.getMetrics().scrollHeightPx === preserved.scrollHeightPx
    ) return;
    this.#cancelPendingLayoutPreservation();
    const distance = Math.max(
      0,
      preserved.distanceFromBottomPx + preserved.wheelDistanceFromBottomPx,
    );
    this.#host.writeDistanceFromBottomPx(distance, "instant");
    this.#distanceFromBottomPx = Math.max(0, this.#host.getMetrics().distanceFromBottomPx);
  }

  #cancelPendingLayoutPreservation(): void {
    this.#preservedLayout = null;
    if (this.#preserveFrame !== null) {
      this.#host.cancelFrame(this.#preserveFrame);
      this.#preserveFrame = null;
    }
  }
}
