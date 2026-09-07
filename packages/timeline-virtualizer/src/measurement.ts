import type {
  TurnLayout,
  TurnVirtualizerConfig,
  VirtualizedTurnEntry,
  VirtualizedTurnViewportState,
} from "./types";
import {
  buildTurnLayout,
  CODEX_TURN_VIRTUALIZER_CONFIG,
  updateTurnViewportState,
} from "./virtualizer";
import { distanceExcludingBottomPadding, isAtVirtualizedBottom } from "./scroll";

export interface TurnHeightMeasurement {
  readonly turnKey: string;
  readonly heightPx: number;
}

export interface LatestTurnMeasurementChange {
  readonly turnKey: string;
  readonly heightDeltaPx: number;
  readonly heightPx: number;
}

export interface TurnMeasurementTransaction {
  readonly measuredHeightsByKey: Readonly<Record<string, number>>;
  readonly layout: TurnLayout;
  readonly viewport: VirtualizedTurnViewportState;
  readonly latestTurnHeightChange: LatestTurnMeasurementChange | null;
  readonly restoreScrollDistanceFromBottom: boolean;
  readonly scrollDistanceFromBottomPx: number | null;
  readonly preservePlatformScrollForNextLayout: boolean;
  readonly canUseLatestTurnFastPath: boolean;
  readonly layoutHeightDeltaPx: number;
}

export interface CreateTurnMeasurementTransactionOptions<TEntry extends VirtualizedTurnEntry> {
  readonly entries: readonly TEntry[];
  readonly measurements: readonly TurnHeightMeasurement[];
  readonly measuredHeightsByKey: Readonly<Record<string, number>>;
  readonly layout: TurnLayout;
  readonly viewport: VirtualizedTurnViewportState;
  readonly currentDistanceFromBottomPx: number;
  readonly bottomPaddingPx: number;
  readonly preserveMeasuredTurnViewport: boolean;
  readonly pendingRestoreScrollDistanceFromBottomPx: number | null;
  readonly previousPendingTransaction?: TurnMeasurementTransaction | null;
  readonly config?: Readonly<TurnVirtualizerConfig>;
}

function positiveHeight(value: number): number {
  return Number.isFinite(value) ? Math.max(1, value) : 1;
}

/**
 * Recovered Codex measurement transaction (the virtualizer's `nt` path) in a
 * platform-neutral form. Every ResizeObserver batch produces one coherent
 * height table, layout, render window and scroll decision.
 */
export function createTurnMeasurementTransaction<TEntry extends VirtualizedTurnEntry>({
  entries,
  measurements,
  measuredHeightsByKey,
  layout,
  viewport,
  currentDistanceFromBottomPx,
  bottomPaddingPx,
  preserveMeasuredTurnViewport,
  pendingRestoreScrollDistanceFromBottomPx,
  previousPendingTransaction = null,
  config = CODEX_TURN_VIRTUALIZER_CONFIG,
}: CreateTurnMeasurementTransactionOptions<TEntry>): TurnMeasurementTransaction | null {
  let nextHeights = measuredHeightsByKey;
  let latestTurnHeightDeltaPx = 0;
  let latestTurnHeightPx: number | null = null;
  let latestTurnChanged = false;
  let layoutHeightDeltaPx = 0;
  let heightDeltaBelowViewportPx = 0;
  let changedCount = 0;
  const virtualDistance = distanceExcludingBottomPadding(currentDistanceFromBottomPx, bottomPaddingPx);
  const compensationDistance = previousPendingTransaction === null
    ? virtualDistance
    : viewport.distanceFromBottomPx;

  for (const measurement of measurements) {
    const index = layout.turnIndexByKey.get(measurement.turnKey);
    if (index === undefined) continue;
    const heightPx = positiveHeight(measurement.heightPx);
    const previousMeasuredHeight = measuredHeightsByKey[measurement.turnKey];
    if (previousMeasuredHeight === heightPx) continue;
    if (nextHeights === measuredHeightsByKey) nextHeights = { ...measuredHeightsByKey };
    (nextHeights as Record<string, number>)[measurement.turnKey] = heightPx;
    changedCount += 1;

    const isLatestTurn = index === layout.turnKeys.length - 1;
    const measuredDelta = heightPx - (previousMeasuredHeight ?? 0);
    if (isLatestTurn) {
      latestTurnChanged = true;
      latestTurnHeightDeltaPx += measuredDelta;
      latestTurnHeightPx = heightPx;
    }

    const layoutDelta = heightPx - (layout.heightsPx[index] ?? heightPx);
    layoutHeightDeltaPx += layoutDelta;
    const bottomOffsetPx = layout.bottomOffsetsPx[index] ?? 0;
    if (
      layoutDelta !== 0
      && bottomOffsetPx <= compensationDistance
      && (preserveMeasuredTurnViewport || (pendingRestoreScrollDistanceFromBottomPx !== null && !isLatestTurn))
    ) {
      heightDeltaBelowViewportPx += layoutDelta;
    }
  }

  if (nextHeights === measuredHeightsByKey) return null;

  const atBottom = preserveMeasuredTurnViewport
    && isAtVirtualizedBottom(currentDistanceFromBottomPx, bottomPaddingPx);
  const restoreScrollDistanceFromBottom = previousPendingTransaction?.restoreScrollDistanceFromBottom === true
    || pendingRestoreScrollDistanceFromBottomPx !== null;
  let scrollDistanceFromBottomPx: number | null = null;
  if (!restoreScrollDistanceFromBottom) {
    scrollDistanceFromBottomPx = atBottom
      ? 0
      : heightDeltaBelowViewportPx === 0
        ? previousPendingTransaction?.scrollDistanceFromBottomPx ?? null
        : (previousPendingTransaction?.scrollDistanceFromBottomPx ?? currentDistanceFromBottomPx)
          + heightDeltaBelowViewportPx;
  }

  const nextLayout = buildTurnLayout(entries, nextHeights, config);
  const targetVirtualDistance = restoreScrollDistanceFromBottom
    ? pendingRestoreScrollDistanceFromBottomPx ?? viewport.distanceFromBottomPx
    : scrollDistanceFromBottomPx === null
      ? viewport.distanceFromBottomPx
      : distanceExcludingBottomPadding(scrollDistanceFromBottomPx, bottomPaddingPx);
  const nextViewport = updateTurnViewportState(
    viewport,
    nextLayout,
    targetVirtualDistance,
    viewport.viewportHeightPx,
    config,
  );

  return {
    measuredHeightsByKey: nextHeights,
    layout: nextLayout,
    viewport: nextViewport,
    latestTurnHeightChange: latestTurnChanged && latestTurnHeightPx !== null
      ? {
          turnKey: layout.turnKeys.at(-1)!,
          heightDeltaPx: latestTurnHeightDeltaPx,
          heightPx: latestTurnHeightPx,
        }
      : previousPendingTransaction?.latestTurnHeightChange ?? null,
    restoreScrollDistanceFromBottom,
    scrollDistanceFromBottomPx,
    preservePlatformScrollForNextLayout:
      preserveMeasuredTurnViewport
      && layoutHeightDeltaPx !== 0
      && heightDeltaBelowViewportPx === 0
      && !atBottom
      && !restoreScrollDistanceFromBottom,
    canUseLatestTurnFastPath:
      latestTurnChanged
      && changedCount === 1
      && previousPendingTransaction === null
      && nextViewport === viewport,
    layoutHeightDeltaPx,
  };
}
