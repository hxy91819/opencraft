import type { BotTimelineUnit } from "@opencraft/bot-conversation";
import { createWebTimelineViewportOwner } from "@opencraft/timeline-host-web";
import {
  buildTimelineLayout,
  createTimelineMeasurementTransaction,
  createTimelineViewportState,
  createTimelineWindowSlice,
  TIMELINE_VIRTUALIZER_CONFIG,
  updateTimelineViewportState,
} from "@opencraft/timeline-virtualizer";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefCallback,
} from "react";

interface VirtualizedBotUnit {
  readonly timelineKey: string;
  readonly estimatedHeightPx: number;
  readonly unit: BotTimelineUnit;
}

export interface BotConversationViewport {
  readonly following: boolean;
  readonly transcriptRef: RefCallback<HTMLDivElement>;
  readonly totalHeightPx: number;
  readonly marginTopPx: number;
  readonly gapPx: number;
  readonly units: readonly BotTimelineUnit[];
  observeUnit(unitKey: string, element: HTMLDivElement | null): void;
  onScroll(): void;
  followLatest(options?: { readonly smooth?: boolean }): void;
}

/**
 * Bot-specific adapter around the shared Codex-derived viewport machinery.
 * Its entries are geometry units only; Bot semantics remain owned by
 * Transcript/Execution/Presence.
 */
export function useBotConversationViewport(
  identity: string,
  units: readonly BotTimelineUnit[],
): BotConversationViewport {
  const entries = useMemo<readonly VirtualizedBotUnit[]>(
    () => units.map((unit) => ({
      timelineKey: unit.unitKey,
      estimatedHeightPx: unit.kind === "message"
        ? 72
        : 36,
      unit,
    })),
    [units],
  );
  const owner = useMemo(
    () => createWebTimelineViewportOwner(0),
    [identity],
  );
  const [measuredHeights, setMeasuredHeights] = useState<Readonly<Record<string, number>>>({});
  const layout = useMemo(
    () => buildTimelineLayout(entries, measuredHeights),
    [entries, measuredHeights],
  );
  const [viewport, setViewport] = useState(() =>
    createTimelineViewportState(
      layout,
      0,
      TIMELINE_VIRTUALIZER_CONFIG.fallbackViewportHeightPx,
    )
  );
  const [following, setFollowing] = useState(true);
  const entriesRef = useRef(entries);
  const layoutRef = useRef(layout);
  const viewportRef = useRef(viewport);
  const measuredRef = useRef(measuredHeights);
  entriesRef.current = entries;
  layoutRef.current = layout;
  viewportRef.current = viewport;
  measuredRef.current = measuredHeights;

  const updateFromPlatform = useCallback((origin: "user" | "system") => {
    const element = owner.scrollElementRef.current;
    if (element === null) return;
    const snapshot = owner.scrollController.reportPlatformScroll(origin);
    setFollowing(!snapshot.isScrolledFromBottom);
    setViewport((current) =>
      updateTimelineViewportState(
        current,
        layoutRef.current,
        snapshot.distanceFromBottomPx,
        element.clientHeight,
      )
    );
  }, [owner]);

  useLayoutEffect(() => {
    setMeasuredHeights({});
    const element = owner.scrollElementRef.current;
    const next = createTimelineViewportState(
      buildTimelineLayout(entries),
      0,
      element?.clientHeight ?? TIMELINE_VIRTUALIZER_CONFIG.fallbackViewportHeightPx,
    );
    viewportRef.current = next;
    setViewport(next);
    owner.scrollController.scrollToDistanceFromBottomPx(0, "instant");
    setFollowing(true);
  }, [identity, owner]);

  useLayoutEffect(() => {
    const element = owner.scrollElementRef.current;
    if (element === null) return;
    setViewport((current) =>
      updateTimelineViewportState(
        current,
        layout,
        owner.scrollController.getLastScrollDistanceFromBottomPx(),
        element.clientHeight,
      )
    );
    if (following) owner.scrollController.scrollToDistanceFromBottomPx(0, "instant");
  }, [following, layout, owner]);

  useLayoutEffect(() => {
    owner.setMeasurementListener(({ measurements }) => {
      const element = owner.scrollElementRef.current;
      if (element === null) return;
      const transaction = createTimelineMeasurementTransaction({
        entries: entriesRef.current,
        measurements,
        measuredHeightsByKey: measuredRef.current,
        layout: layoutRef.current,
        viewport: viewportRef.current,
        currentDistanceFromBottomPx:
          owner.scrollController.getLastScrollDistanceFromBottomPx(),
        bottomPaddingPx: 0,
        preserveMeasuredViewport: true,
        pendingRestoreScrollDistanceFromBottomPx: null,
      });
      if (transaction === null) return;
      measuredRef.current = transaction.measuredHeightsByKey;
      layoutRef.current = transaction.layout;
      viewportRef.current = transaction.viewport;
      if (transaction.preservePlatformScrollForNextLayout) {
        owner.scrollController.preserveScrollPositionForNextLayout();
      }
      setMeasuredHeights(transaction.measuredHeightsByKey);
      setViewport(transaction.viewport);
      if (transaction.scrollDistanceFromBottomPx !== null) {
        owner.scrollController.compensateScrollToDistanceFromBottomPx(
          transaction.scrollDistanceFromBottomPx,
        );
      }
    });
    return () => owner.setMeasurementListener(null);
  }, [owner]);

  useEffect(() => {
    const releaseGeometry = owner.observeViewportGeometry(() =>
      updateFromPlatform("system")
    );
    const releaseInput = owner.bindScrollPortListeners({
      keydown: () => owner.scrollController.cancelPendingLayoutPreservation(),
      pointerdown: () => owner.scrollController.cancelPendingLayoutPreservation(),
      touchstart: () => owner.scrollController.cancelPendingLayoutPreservation(),
      wheel: (event) => {
        owner.scrollController.cancelScrollAnimation();
        owner.scrollController.recordWheelDelta(event.deltaY);
      },
    });
    updateFromPlatform("system");
    return () => {
      releaseGeometry();
      releaseInput();
      owner.dispose();
    };
  }, [owner, updateFromPlatform]);

  const followLatest = useCallback((options?: { readonly smooth?: boolean }) => {
    setFollowing(true);
    if (options?.smooth === false) {
      owner.scrollController.scrollToDistanceFromBottomPx(0, "instant");
    } else {
      owner.scrollController.scrollToBottom();
    }
  }, [owner]);
  const onScroll = useCallback(() => updateFromPlatform("user"), [updateFromPlatform]);
  const observeUnit = useCallback(
    (unitKey: string, element: HTMLDivElement | null) =>
      owner.observeEntry(unitKey, element),
    [owner],
  );
  const windowSlice = createTimelineWindowSlice(
    entries,
    layout,
    viewport.renderedRange,
  );

  return {
    following,
    transcriptRef: owner.attachScrollElement,
    totalHeightPx: windowSlice.totalHeightPx,
    marginTopPx: windowSlice.marginTopPx,
    gapPx: windowSlice.gapPx,
    units: windowSlice.entries.map((entry) => entry.unit),
    observeUnit,
    onScroll,
    followLatest,
  };
}
