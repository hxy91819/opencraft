import type { TurnViewportMetrics } from "./ports";
import { shouldLoadOlderHistory } from "./scroll";

export type TurnHistoryPageResult = void | "stop";

export interface TurnHistoryBackfillPort {
  readonly afterLayout: () => Promise<void>;
  readonly isEnabled: () => boolean;
  readonly loadPage: () => TurnHistoryPageResult | Promise<TurnHistoryPageResult>;
  readonly readMetrics: () => TurnViewportMetrics | null;
  readonly onError?: (error: unknown) => void;
}

interface FillRequest {
  readonly epoch: number;
  readonly completion: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
}

/**
 * Serial request scheduler. A running page keeps its slot until its layout
 * barrier ends. Requests from newer owners wait for that slot; obsolete
 * waiting requests share the latest owner's fill operation.
 */
export class TurnHistoryBackfillCoordinator {
  private epoch = 0;
  private running: FillRequest | null = null;
  private waiting: FillRequest[] = [];

  constructor(private readonly port: TurnHistoryBackfillPort) {}

  invalidate(): void {
    this.epoch += 1;
  }

  request = (): Promise<void> => {
    const existing = this.running?.epoch === this.epoch ? this.running
      : this.waiting.find(request => request.epoch === this.epoch);
    if (existing) return existing.completion;

    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const completion = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
    this.waiting.push({ epoch: this.epoch, completion, resolve, reject });
    this.startWaiting();
    return completion;
  };

  private startWaiting(): void {
    if (this.running || this.waiting.length === 0) return;
    const batch = this.waiting;
    this.waiting = [];
    const owner = batch.at(-1)!;
    // Publish ownership before invoking user code, including synchronous loaders.
    this.running = { ...owner, epoch: this.epoch };
    const epoch = this.running.epoch;
    const finish = (error?: { readonly value: unknown }) => {
      this.running = null;
      for (const request of batch) {
        if (error) request.reject(error.value);
        else request.resolve();
      }
      this.startWaiting();
    };
    void this.fill(epoch).then(() => finish(), error => finish({ value: error }));
  }

  private async fill(epoch: number): Promise<void> {
    try {
      let previousHeight: number | undefined;
      while (epoch === this.epoch && this.port.isEnabled()) {
        const metrics = this.port.readMetrics();
        if (!metrics || metrics.scrollHeightPx === previousHeight) break;
        const needsPage = shouldLoadOlderHistory({
          contentHeightPx: metrics.scrollHeightPx,
          distanceFromBottomPx: metrics.distanceFromBottomPx,
          viewportHeightPx: metrics.viewportHeightPx,
        });
        if (!needsPage) break;
        previousHeight = metrics.scrollHeightPx;
        const outcome = await this.port.loadPage();
        await this.port.afterLayout();
        if (outcome === "stop") break;
      }
    } catch (error) {
      this.port.onError?.(error);
    }
  }
}
