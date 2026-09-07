import {
  createTimelineTurnPresentationPlan,
  deriveTimelineLatestTurnPhase,
  groupTimelineFramesByTurn,
  isAgentActivityCollapsed,
  presentAutomationUpdate,
  type AssistantTurnPresentationPlan,
  type AutomationUpdateTimelineBlock,
  type TimelineBlock,
  type TimelineFrame,
  type TimelineSnapshot,
  type ToolActivityPresentation,
  type ToolActivityPresenterRegistry,
  type TimelineTurnView,
  type TurnDiffTimelineBlock,
  type TurnId,
} from "@opencraft/chat-core";
import type { ConversationNavigationSource } from "@opencraft/chat-navigation";
import {
  WebChatDocument,
  resolveStandardChatResource,
} from "@opencraft/chat-render-web";
import {
  buildTurnLayout,
  CODEX_TURN_VIRTUALIZER_CONFIG,
  compensateDistanceFromBottom,
  computeTurnRange,
  createInitialTurnFollowState,
  createLatestTurnPlacementSnapshot,
  createTurnMeasurementTransaction,
  createTurnRestoreState,
  createTurnFollowState,
  createTurnViewportState,
  createTurnWindowSlice,
  directionForTouchDelta,
  directionForWheelDelta,
  distanceExcludingBottomPadding,
  distanceAfterLatestTurnHeightChange,
  distanceFromBottomToCenterTurn,
  distanceFromBottomToTargetWithinTurn,
  distanceFromBottomToTopTurn,
  distanceFromTopPx,
  findMeasuredViewportAnchor,
  getTurnGeometry,
  keyboardScrollDirection,
  maximumResponseSpacerHeightPx,
  normalizeFollowRestorePosition,
  normalizeInitialScrollDistance,
  normalizeInvertedWebViewportMetrics,
  normalizeWheelDeltaPx,
  reconcileRenderedRangeForEntries,
  reduceTurnFollowState,
  reduceTurnRestoreState,
  responseSpacerOverflowPx,
  serializeTurnRestoreState,
  updateTurnViewportState,
  shouldFollowLatestTurn,
  shouldPlaceLatestTurnFromPendingSubmit,
  shouldShowScrollToBottomAction,
  shouldLoadOlderHistory,
  resolveScrollOrigin,
  footerResizeCompensation,
  footerScrollPaddingPx,
  isViewportPreservingTurnFollowMode,
  DEFAULT_TIMELINE_SURFACE_CAPABILITIES,
  type ScrollDirectionSample,
  type TimelineSurfaceCapabilities,
  type TurnConversationScrollApi,
  type TurnFollowRestoreState,
  type TurnMeasurementTransaction,
  type VirtualizedTurnRestoreState,
  type VirtualizedTurnListApi,
  type VirtualizedTurnViewportState,
} from "@opencraft/timeline-virtualizer";
import {
  createWebConversationViewportOwner,
} from "@opencraft/timeline-host-web";
import { useStableEvent } from "@opencraft/react-runtime";
import { useTurnHistoryBackfill } from "@opencraft/timeline-react";
import type { TimelineBlockRendererProps } from "@opencraft/timeline-render-react";
import { UserMessageNavigationRail } from "./user-message-navigation-rail";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  FileCode2,
  ListChecks,
  RotateCcw,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion/react";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";

import { TurnRenderErrorBoundary } from "./turn-render-error-boundary";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";
import {
  ConversationDocumentContext,
  type ConversationDocumentContextValue,
} from "./conversation/document-context";
import { UserMessageBlock } from "./conversation/user-message";
import { UnifiedDiffPreview } from "./conversation-renderers/unified-diff-preview";
import {
  ActivityDisclosure,
  CadencedShimmer,
  useCodexActivityOpen,
} from "./conversation-renderers/activity/activity-disclosure";
import {
  ConversationInteractionContext,
  DEFAULT_TOOL_ACTIVITY_PRESENTERS,
  SubagentNavigationContext,
  ToolActivityPresenterContext,
  ToolCallContentRendererContext,
  ToolCallIconRendererContext,
  useToolActivityPresentation,
  type ConversationInteractionAction,
  type ConversationInteractionContextValue,
  type SubagentNavigationContextValue,
  type ToolCallContentRenderer,
  type ToolCallIconRenderer,
} from "./conversation-renderers/render-contexts";
import {
  AssistantCopyButton,
  AutomaticApprovalReviewBlock,
  AutomaticApprovalReviewList,
  AutoReviewInterruptionWarningBlock,
  CommandBlock,
  ReasoningBlock,
} from "./conversation-renderers/activity/command-and-review-renderers";
import {
  AgentActivity,
  GenericBlock,
  HookStatsButton,
  type ConversationDetailLevel,
} from "./conversation-renderers/activity/agent-activity-renderers";
import { InteractionTimelineStatusBlock } from "./conversation-renderers/interaction/interaction-renderers";
import {
  GeneratedImageBlock,
  ImageViewToolBlock,
  JsonPreview,
  SubagentActivityGroup,
  SubagentBlock,
  ToolCallBlock,
} from "./conversation-renderers/tool/tool-renderers";

export type { ConversationDocumentContextValue } from "./conversation/document-context";
export type {
  ConversationInteractionAction,
  ToolCallContentRenderer,
  ToolCallIconRenderer,
} from "./conversation-renderers/render-contexts";
export type { ConversationDetailLevel } from "./conversation-renderers/activity/agent-activity-renderers";

function fileChangeVerb(
  kind: Extract<TimelineBlock, { type: "patch" }>["changes"][number]["kind"],
  state: ToolActivityPresentation["state"],
): string {
  if (state === "failed") return "Rejected";
  if (state === "interrupted") {
    return kind === "add" ? "Stopped creating" : kind === "delete" ? "Stopped deleting" : "Stopped editing";
  }
  if (state === "running") {
    return kind === "add" ? "Creating" : kind === "delete" ? "Deleting" : "Editing";
  }
  return kind === "add" ? "Created" : kind === "delete" ? "Deleted" : "Edited";
}

function FileChangeActivity({
  block,
  change,
}: {
  block: Extract<TimelineBlock, { type: "patch" }>;
  change: Extract<TimelineBlock, { type: "patch" }>["changes"][number];
}) {
  const documentContext = useContext(ConversationDocumentContext);
  const presentation = useToolActivityPresentation(block);
  const hasDiff = change.unifiedDiff !== null && change.unifiedDiff.trim().length > 0;
  const [open, setOpen] = useCodexActivityOpen(presentation.state === "running");
  const target = change.movePath ?? change.path;
  const openFile = useCallback(() => {
    const decision = resolveStandardChatResource(target, {
      cwd: documentContext.cwd,
      externalResourcePolicy: "allow",
    });
    if (decision.allowed && decision.target !== null) {
      documentContext.onOpenResource?.(decision.target, decision);
    }
  }, [documentContext, target]);
  return (
    <ActivityDisclosure
      detail={(
        <button
          className="thread-activity-item__file-link"
          onClick={(event) => { event.stopPropagation(); openFile(); }}
          type="button"
        >
          {change.movePath === null ? change.path : `${change.path} → ${change.movePath}`}
        </button>
      )}
      icon={<FileCode2 size={14} />}
      onOpenChange={setOpen}
      open={open}
      running={presentation.state === "running"}
      status={presentation.state}
      summary={fileChangeVerb(change.kind, presentation.state)}
      trailing={(change.additions ?? 0) > 0 || (change.deletions ?? 0) > 0
        ? <><b className="is-added">+{change.additions ?? 0}</b><i className="is-deleted">−{change.deletions ?? 0}</i></>
        : null}
    >
      {hasDiff ? <UnifiedDiffPreview diff={change.unifiedDiff!} /> : null}
    </ActivityDisclosure>
  );
}

function PatchBlock({ block }: { block: Extract<TimelineBlock, { type: "patch" }> }) {
  const presentation = useToolActivityPresentation(block);
  if (block.changes.length === 0) {
    return (
      <>
        <div className="thread-activity-item thread-activity-item--static" data-status={presentation.state}>
          <div className="thread-activity-item__header">
            <span className="thread-activity-item__icon"><FileCode2 size={14} /></span>
            <span className="thread-activity-item__summary">{presentation.summary}</span>
          </div>
        </div>
        <AutomaticApprovalReviewList reviews={block.automaticApprovalReviews} />
      </>
    );
  }
  return (
    <div className="thread-patch-activities">
      {block.changes.map((change, index) => (
        <FileChangeActivity block={block} change={change} key={`${change.path}:${change.movePath ?? ""}:${index}`} />
      ))}
      <AutomaticApprovalReviewList reviews={block.automaticApprovalReviews} />
    </div>
  );
}

function turnDiffDisplayPath(path: string): { readonly basename: string; readonly directory: string } {
  const normalized = path.replaceAll("\\", "/");
  const separator = normalized.lastIndexOf("/");
  return separator < 0
    ? { basename: normalized, directory: "" }
    : { basename: normalized.slice(separator + 1), directory: normalized.slice(0, separator + 1) };
}

function TurnDiffStats({ additions, deletions }: { readonly additions: number; readonly deletions: number }) {
  if (additions === 0 && deletions === 0) return null;
  return (
    <span className="thread-turn-diff__stats" aria-label={`${additions} lines added, ${deletions} lines removed`}>
      {additions > 0 ? <b>+{additions}</b> : null}
      {deletions > 0 ? <i>−{deletions}</i> : null}
    </span>
  );
}

function TurnDiffBlock({ block }: { readonly block: TurnDiffTimelineBlock }) {
  const documentContext = useContext(ConversationDocumentContext);
  const [expandedFiles, setExpandedFiles] = useState(false);
  const [lastAction, setLastAction] = useState<"undo" | "reapply" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const inProgress = block.status === "pending" || block.status === "running";
  const files = expandedFiles ? block.files : block.files.slice(0, 3);
  const hiddenFileCount = block.files.length - files.length;
  const nextAction = lastAction === "undo" ? "reapply" : "undo";

  const openPath = useCallback((path: string) => {
    const decision = resolveStandardChatResource(path, {
      cwd: documentContext.cwd,
      externalResourcePolicy: "allow",
    });
    if (decision.allowed && decision.target !== null) {
      documentContext.onOpenResource?.(decision.target, decision);
    }
  }, [documentContext]);
  const review = useCallback((path?: string) => {
    if (documentContext.onReviewTurnDiff !== undefined) documentContext.onReviewTurnDiff(block, path);
    else if (path !== undefined) openPath(path);
  }, [block, documentContext, openPath]);
  const apply = useCallback(async (action: "undo" | "reapply") => {
    if (documentContext.onApplyTurnDiff === undefined || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await documentContext.onApplyTurnDiff(block, action);
      setLastAction(action);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  }, [block, documentContext, submitting]);

  if (block.files.length === 0) return null;
  if (inProgress) {
    return (
      <motion.button
        animate={{ opacity: 1 }}
        className="thread-turn-diff-live"
        initial={{ opacity: 0 }}
        onClick={() => review()}
        transition={{ duration: 0.18, ease: "easeOut" }}
        type="button"
      >
        <span>{block.files.length === 1 ? "1 file changed" : `${block.files.length} files changed`}</span>
        <TurnDiffStats additions={block.additions} deletions={block.deletions} />
      </motion.button>
    );
  }

  const singleFile = block.files.length === 1 ? block.files[0]! : null;
  const title = singleFile === null
    ? `Edited ${block.files.length} files`
    : `Edited ${turnDiffDisplayPath(singleFile.path).basename}`;
  return (
    <section className="thread-turn-diff" data-status={block.status}>
      <div className="thread-turn-diff__header">
        <button
          aria-label="Review changed files"
          className="thread-turn-diff__header-target"
          onClick={() => review(singleFile?.path)}
          type="button"
        />
        <span className="thread-turn-diff__icon"><FileCode2 aria-hidden="true" size={24} /></span>
        <span className="thread-turn-diff__copy">
          <strong>{title}</strong>
          <span className="thread-turn-diff__subtitle">
            <span className="thread-turn-diff__default-subtitle"><TurnDiffStats additions={block.additions} deletions={block.deletions} /></span>
            <span className="thread-turn-diff__hover-subtitle">Review changes <ArrowRight aria-hidden="true" size={12} /></span>
          </span>
        </span>
        <span className="thread-turn-diff__actions">
          <button
            disabled={documentContext.onApplyTurnDiff === undefined || submitting}
            onClick={(event) => { event.stopPropagation(); void apply(nextAction); }}
            type="button"
          >
            {nextAction === "undo" ? "Undo" : "Reapply"}
            {nextAction === "undo" ? <Undo2 aria-hidden="true" size={12} /> : <Redo2 aria-hidden="true" size={12} />}
          </button>
          <button className="is-review" onClick={(event) => { event.stopPropagation(); review(singleFile?.path); }} type="button">Review</button>
        </span>
      </div>
      {block.files.length > 1 ? (
        <div className="thread-turn-diff__files">
          {files.map((file) => {
            const display = turnDiffDisplayPath(file.path);
            return (
              <button aria-label={`Open ${file.path}`} key={file.path} onClick={() => review(file.path)} type="button">
                <span className="thread-turn-diff__path"><span>{display.directory}</span><b>{display.basename}</b></span>
                <TurnDiffStats additions={file.additions} deletions={file.deletions} />
              </button>
            );
          })}
          {hiddenFileCount > 0 ? <button className="thread-turn-diff__more" onClick={() => setExpandedFiles(true)} type="button">Show {hiddenFileCount} more {hiddenFileCount === 1 ? "file" : "files"}<ChevronDown size={12} /></button> : null}
          {expandedFiles && block.files.length > 3 ? <button className="thread-turn-diff__more" onClick={() => setExpandedFiles(false)} type="button">Collapse files<ChevronDown className="is-expanded" size={12} /></button> : null}
        </div>
      ) : null}
      {actionError === null ? null : <p className="thread-turn-diff__error" role="alert">{actionError}</p>}
    </section>
  );
}

function AutomationUpdateBlock({ block }: { readonly block: AutomationUpdateTimelineBlock }) {
  const documentContext = useContext(ConversationDocumentContext);
  const presentation = presentAutomationUpdate(block);
  const canOpen = presentation.canOpen && documentContext.onOpenAutomation !== undefined;
  return (
    <section className="thread-automation-update" data-automation-mode={block.resultMode ?? block.mode}>
      <button
        aria-label={[presentation.actionLabel, presentation.scheduleLabel, presentation.title].filter(Boolean).join(" · ")}
        disabled={!canOpen}
        onClick={() => documentContext.onOpenAutomation?.(block)}
        type="button"
      >
        <span className="thread-automation-update__icon"><CalendarClock aria-hidden="true" size={24} /></span>
        <span className="thread-automation-update__copy">
          <strong>{presentation.title}</strong>
          <span>{presentation.subtitle}</span>
        </span>
        {canOpen ? <span className="thread-automation-update__open">Open <ArrowRight aria-hidden="true" size={12} /></span> : null}
      </button>
    </section>
  );
}

function UserMessageTimelineRenderer({ block }: TimelineBlockRendererProps) {
  return block.type === "user-message" ? <UserMessageBlock block={block} /> : null;
}

function TextTimelineRenderer({ block, richText }: TimelineBlockRendererProps) {
  const documentContext = useContext(ConversationDocumentContext);
  if (block.type !== "text") return null;
  return richText
    ? <WebChatDocument
        conversationId={documentContext.conversationId}
        cwd={documentContext.cwd}
        documentId={block.id}
        hostId={documentContext.hostId}
        loadMediaSource={documentContext.loadMediaSource}
        onMeasurementRequest={documentContext.onMeasurementRequest}
        onOpenResource={documentContext.onOpenResource}
        source={block.text}
        streaming={block.streaming}
        theme={documentContext.theme}
      />
    : <p>{block.text}</p>;
}

function RealtimeTranscriptTimelineRenderer({ block }: TimelineBlockRendererProps) {
  if (block.type !== "realtime-transcript") return null;
  return (
    <section className="thread-realtime-transcript" data-handoff-id={block.handoffId ?? undefined}>
      <strong>Voice transcript</strong>
      <div className="thread-realtime-transcript__entries">
        {block.entries.map((entry, index) => (
          <p data-role={entry.role} key={`${entry.role}:${index}`}>
            <span>{entry.role === "user" ? "You" : "Codex"}</span>
            {entry.text}
          </p>
        ))}
      </div>
    </section>
  );
}

function PlanTimelineRenderer({ block }: TimelineBlockRendererProps) {
  if (block.type !== "plan") return null;
  return <div className="thread-semantic-card"><strong>{block.title ?? "Plan"}</strong><p>{block.text}</p>{block.implemented ? <small>Implemented</small> : null}</div>;
}

function TodoTimelineRenderer({ block }: TimelineBlockRendererProps) {
  if (block.type !== "todo") return null;
  return <div className="thread-semantic-card"><strong><ListChecks size={14} /> Tasks</strong><ul>{block.entries.map((entry) => <li data-status={entry.status} key={entry.id}>{entry.text}</li>)}</ul></div>;
}

function ErrorTimelineRenderer({ block, onRetry }: TimelineBlockRendererProps) {
  if (block.type !== "error") return null;
  if (block.recovery === "automatic") {
    return <div className="thread-stream-error" role="status"><CadencedShimmer active>{block.message}</CadencedShimmer></div>;
  }
  return (
    <aside
      className="thread-system-error"
      data-error-code={block.code ?? undefined}
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="thread-system-error__icon" size={16} />
      <p className="thread-system-error__message">{block.message}</p>
      {onRetry ? (
        <button className="thread-system-error__retry" type="button" onClick={onRetry}>
          <RotateCcw aria-hidden="true" size={14} />
          Continue
        </button>
      ) : null}
    </aside>
  );
}

function InteractionTimelineRenderer({ block }: TimelineBlockRendererProps) {
  return block.type === "approval" || block.type === "question" || block.type === "option-picker" || block.type === "elicitation"
    ? <InteractionTimelineStatusBlock block={block} />
    : null;
}

const componentRenderer = <T extends TimelineBlock["type"]>(
  type: T,
  render: (block: Extract<TimelineBlock, { type: T }>) => ReactNode,
) => function RegisteredTimelineRenderer({ block }: TimelineBlockRendererProps) {
  return block.type === type ? render(block as Extract<TimelineBlock, { type: T }>) : null;
};

/** Presentation components consumed by the root-owned Web renderer plugin. */
export const webBuiltinTimelineRendererComponents = Object.freeze({
  userMessage: UserMessageTimelineRenderer,
  text: TextTimelineRenderer,
  reasoning: componentRenderer("reasoning", (block) => <ReasoningBlock block={block} />),
  realtimeTranscript: RealtimeTranscriptTimelineRenderer,
  command: componentRenderer("command-execution", (block) => <CommandBlock block={block} />),
  patch: componentRenderer("patch", (block) => <PatchBlock block={block} />),
  turnDiff: componentRenderer("turn-diff", (block) => <TurnDiffBlock block={block} />),
  automationUpdate: componentRenderer("automation-update", (block) => <AutomationUpdateBlock block={block} />),
  imageViewTool: componentRenderer("tool-call", (block) => <ImageViewToolBlock block={block} />),
  toolCall: componentRenderer("tool-call", (block) => <ToolCallBlock block={block} />),
  automaticApprovalReview: componentRenderer("automatic-approval-review", (block) => block.review.status === "approved" ? null : <AutomaticApprovalReviewBlock block={block} />),
  autoReviewWarning: componentRenderer("auto-review-interruption-warning", (block) => <AutoReviewInterruptionWarningBlock block={block} />),
  plan: PlanTimelineRenderer,
  todo: TodoTimelineRenderer,
  subagent: componentRenderer("subagent", (block) => <SubagentBlock block={block} />),
  interaction: InteractionTimelineRenderer,
  error: ErrorTimelineRenderer,
  compaction: componentRenderer("compaction", (block) => <div className="thread-event-divider"><span>{block.summary ?? "Earlier context was compacted"}</span></div>),
  image: componentRenderer("image", (block) => <GeneratedImageBlock block={block} />),
  unknown: componentRenderer("unknown", (block) => <details className="thread-semantic-card"><summary>Unsupported AppServer item: {block.itemType}</summary><JsonPreview value={block.payload} /></details>),
});

function Frame({
  allowSingleSlotVirtualization,
  activityCollapsedById,
  assistantPlan,
  frame,
  onActivityCollapsedChange,
  onRetry,
  thinkingId,
  showActions,
  threadDetailLevel,
}: {
  allowSingleSlotVirtualization: boolean;
  activityCollapsedById: Readonly<Record<string, boolean>>;
  assistantPlan: AssistantTurnPresentationPlan | null;
  frame: TimelineFrame;
  onActivityCollapsedChange: (id: string, collapsed: boolean) => void;
  onRetry?: () => void;
  thinkingId: string | null;
  showActions: boolean;
  threadDetailLevel: ConversationDetailLevel;
}) {
  const visibleFrame = frame;
  if (visibleFrame.blocks.length === 0 && thinkingId === null) return null;
  if (visibleFrame.type === "user") {
    const itemId = visibleFrame.anchors.find((anchor) => anchor.type === "item")?.id ?? visibleFrame.id;
    return (
      <div
        className="thread-user-message-anchor"
        data-content-search-unit-key={itemId}
        data-local-conversation-user-anchor=""
        data-virtualized-turn-content={allowSingleSlotVirtualization ? "" : undefined}
      >
        {visibleFrame.blocks.map((block) => block.type === "user-message"
          ? <UserMessageBlock
              block={block}
              hookStatsAccessory={block.deliveryStatus === "not-sent" && visibleFrame.hookStats !== null
                ? <HookStatsButton detailLevel="STEPS_COMMANDS" stats={visibleFrame.hookStats} />
                : undefined}
              key={block.id}
            />
          : <div className="thread-user-message" key={block.id}><GenericBlock block={block} richText={false} /></div>)}
      </div>
    );
  }
  const units = assistantPlan?.slots ?? [];
  const assistantCopyText = visibleFrame.type === "assistant"
    ? visibleFrame.blocks.flatMap((block) => block.type === "text" && block.phase !== "commentary" ? [block.text] : []).join("\n\n").trim()
    : "";
  const hasMessageActions = assistantCopyText.length > 0 || onRetry !== undefined || visibleFrame.hookStats !== null;
  const virtualizeSingleSlot = allowSingleSlotVirtualization;
  return (
    <div className={`thread-frame thread-frame--${visibleFrame.type}`} data-frame-key={visibleFrame.id}>
      {visibleFrame.type === "assistant"
        ? units.map((unit) => {
          const content = unit.type === "agent-activity" ? (
              <AgentActivity
                collapsed={isAgentActivityCollapsed(unit, activityCollapsedById[unit.id])}
                onCollapsedChange={(collapsed) => onActivityCollapsedChange(unit.id, collapsed)}
                onRetry={onRetry}
                unit={unit}
              />
            ) : unit.type === "subagent-activity"
              ? <SubagentActivityGroup unit={unit} />
              : <GenericBlock block={unit.block} onRetry={onRetry} />;
          return (
            <div
              className="thread-frame__slot"
              data-virtualized-turn-content={virtualizeSingleSlot ? "" : undefined}
              key={unit.id}
            >
              {content}
            </div>
          );
        })
        : visibleFrame.blocks.map((block) => (
          <div
            className="thread-frame__slot"
            data-virtualized-turn-content={virtualizeSingleSlot ? "" : undefined}
            key={block.id}
          >
            <GenericBlock block={block} onRetry={onRetry} />
          </div>
        ))}
      {thinkingId === null ? null : (
        <div
          aria-live="polite"
          className="thread-thinking-placeholder thread-frame__slot"
          data-virtualized-turn-content={virtualizeSingleSlot ? "" : undefined}
          key={thinkingId}
        >
          <span aria-hidden="true" /><CadencedShimmer active>Thinking</CadencedShimmer>
        </div>
      )}
      {visibleFrame.type === "assistant" && visibleFrame.status === "complete" && showActions && hasMessageActions ? (
        <div className="thread-message-actions">
          {assistantCopyText.length > 0 ? <AssistantCopyButton value={assistantCopyText} /> : null}
          {onRetry === undefined ? null : <button onClick={onRetry} type="button" title="Retry"><RotateCcw size={13} /></button>}
          {visibleFrame.hookStats == null ? null : <HookStatsButton detailLevel={threadDetailLevel} stats={visibleFrame.hookStats} />}
        </div>
      ) : null}
    </div>
  );
}

function Turn({
  activityCollapsedById,
  onActivityCollapsedChange,
  onRetry,
  isMostRecentTurn,
  threadDetailLevel,
  turn,
}: {
  activityCollapsedById: Readonly<Record<string, boolean>>;
  onActivityCollapsedChange: (id: string, collapsed: boolean) => void;
  onRetry?: () => void;
  isMostRecentTurn: boolean;
  threadDetailLevel: ConversationDetailLevel;
  turn: TimelineTurnView;
}) {
  const toolActivityPresenters = useContext(ToolActivityPresenterContext);
  const toolActivityPresenterVersion = useSyncExternalStore(
    toolActivityPresenters.subscribe,
    toolActivityPresenters.getSnapshot,
    toolActivityPresenters.getSnapshot,
  );
  const presentation = useMemo(
    () => createTimelineTurnPresentationPlan(turn, toolActivityPresenters, { isMostRecentTurn }),
    [isMostRecentTurn, toolActivityPresenterVersion, toolActivityPresenters, turn],
  );
  const virtualizeSingleSlot = presentation.topLevelSlotCount === 1;
  return (
    <section className="thread-turn" data-turn-key={turn.turnKey} data-turn-status={turn.status}>
      {presentation.userFrames.map((frame) => (
        <Frame
          allowSingleSlotVirtualization={virtualizeSingleSlot}
          activityCollapsedById={activityCollapsedById}
          assistantPlan={null}
          frame={frame}
          key={frame.id}
          onActivityCollapsedChange={onActivityCollapsedChange}
          onRetry={onRetry}
          showActions={false}
          thinkingId={null}
          threadDetailLevel={threadDetailLevel}
        />
      ))}
      {presentation.assistantFrame === null ? null : (
        <Frame
          allowSingleSlotVirtualization={virtualizeSingleSlot}
          activityCollapsedById={activityCollapsedById}
          assistantPlan={presentation.assistant}
          frame={presentation.assistantFrame}
          key={presentation.assistantFrame.id}
          onActivityCollapsedChange={onActivityCollapsedChange}
          onRetry={onRetry}
          showActions
          thinkingId={presentation.showThinking ? presentation.thinkingId : null}
          threadDetailLevel={threadDetailLevel}
        />
      )}
      {presentation.auxiliaryFrames.map((frame) => (
        <Frame
          allowSingleSlotVirtualization={virtualizeSingleSlot}
          activityCollapsedById={activityCollapsedById}
          assistantPlan={null}
          frame={frame}
          key={frame.id}
          onActivityCollapsedChange={onActivityCollapsedChange}
          onRetry={onRetry}
          showActions={false}
          thinkingId={null}
          threadDetailLevel={threadDetailLevel}
        />
      ))}
    </section>
  );
}

export interface ConversationRestoreSnapshot {
  readonly agentActivityCollapsedById?: Readonly<Record<string, boolean>>;
  readonly distanceFromBottomPx: number;
  readonly virtualizedTurnList: VirtualizedTurnRestoreState | null;
  readonly turnFollow?: TurnFollowRestoreState | null;
}

export interface ConversationProps {
  readonly timeline: TimelineSnapshot | null;
  /** Protocol-neutral prompt index. V3 cursors and V4 epochs remain behind this port. */
  readonly navigationSource?: ConversationNavigationSource | null;
  readonly bottomScrollPaddingPx?: number;
  readonly footer?: ReactNode;
  readonly documentContext?: ConversationDocumentContextValue;
  readonly initialRestoreSnapshot?: ConversationRestoreSnapshot | null;
  readonly onRestoreSnapshotChange?: (snapshot: ConversationRestoreSnapshot) => void;
  readonly onLoadOlder?: () => void | "stop" | Promise<void | "stop">;
  readonly onContinueTurn?: (turnId: TurnId) => void;
  readonly continuableTurnId?: TurnId | null;
  /** Opens a child/background-agent thread when the host exposes it. */
  readonly onOpenSubagent?: (threadId: string, displayName: string) => void;
  readonly onRespondInteraction?: (requestId: string, action: ConversationInteractionAction) => Promise<void>;
  readonly onConversationScrollApiChange?: (api: ConversationScrollApi | null) => void;
  readonly onVisibleContentReady?: () => void;
  readonly onVirtualizedTurnListApiChange?: (api: VirtualizedTurnListApi | null) => void;
  /** Renderer-neutral semantics supplied by product feature plugins. */
  readonly toolActivityPresenterRegistry?: ToolActivityPresenterRegistry;
  /** Optional product renderer for tool bodies such as Skills or Figma cards. */
  readonly renderToolCallContent?: ToolCallContentRenderer;
  /** Host resolver for external app/plugin/native icons; no network policy lives in ChatUI. */
  readonly renderToolCallIcon?: ToolCallIconRenderer;
  /** Host/layout capabilities; protocol and conversation data never infer these. */
  readonly surfaceCapabilities?: TimelineSurfaceCapabilities;
  /** Mirrors Codex's conversationDetailMode; commands is the desktop default. */
  readonly threadDetailLevel?: ConversationDetailLevel;
}

export type ConversationScrollApi = TurnConversationScrollApi;

function distanceFromBottom(element: HTMLDivElement): number {
  return normalizeInvertedWebViewportMetrics({
    contentHeightPx: element.scrollHeight,
    viewportHeightPx: element.clientHeight,
    scrollTopPx: element.scrollTop,
  }).distanceFromBottomPx;
}

interface PendingScrollRequest {
  readonly align: "center" | "top";
  readonly behavior: "instant" | "smooth";
  cancelSettlement: (() => void) | null;
  readonly complete: (result: "positioned" | "cancelled" | "unavailable") => void;
  readonly minimumTimelineRevision: number;
  phase: "awaiting-render" | "scrolling";
  readonly targetKey?: string;
  readonly topAlignmentInsetPx?: number;
  readonly turnKey: string;
}

const CODEX_LATEST_TURN_SPRING = Object.freeze({
  bounce: 0,
  duration: 0.5,
  type: "spring" as const,
});

function AnimatedTurn({
  activityCollapsedById,
  offset,
  onActivityCollapsedChange,
  onRetry,
  isMostRecentTurn,
  threadDetailLevel,
  turn,
}: {
  readonly activityCollapsedById: Readonly<Record<string, boolean>>;
  readonly offset: MotionValue<number> | null;
  readonly onActivityCollapsedChange: (id: string, collapsed: boolean) => void;
  readonly onRetry?: () => void;
  readonly isMostRecentTurn: boolean;
  readonly threadDetailLevel: ConversationDetailLevel;
  readonly turn: TimelineTurnView;
}) {
  return offset === null
    ? <Turn activityCollapsedById={activityCollapsedById} isMostRecentTurn={isMostRecentTurn} onActivityCollapsedChange={onActivityCollapsedChange} onRetry={onRetry} threadDetailLevel={threadDetailLevel} turn={turn} />
    : <motion.div style={{ y: offset }}><Turn activityCollapsedById={activityCollapsedById} isMostRecentTurn={isMostRecentTurn} onActivityCollapsedChange={onActivityCollapsedChange} onRetry={onRetry} threadDetailLevel={threadDetailLevel} turn={turn} /></motion.div>;
}

export function Conversation({
  timeline,
  navigationSource = null,
  bottomScrollPaddingPx: suppliedBottomScrollPaddingPx = 0,
  footer,
  documentContext = { conversationId: null, cwd: null, hostId: null, theme: "light" },
  initialRestoreSnapshot = null,
  onRestoreSnapshotChange,
  onLoadOlder,
  onOpenSubagent,
  onContinueTurn,
  continuableTurnId = null,
  onRespondInteraction,
  onConversationScrollApiChange,
  onVisibleContentReady,
  onVirtualizedTurnListApiChange,
  toolActivityPresenterRegistry = DEFAULT_TOOL_ACTIVITY_PRESENTERS,
  renderToolCallContent,
  renderToolCallIcon,
  surfaceCapabilities = DEFAULT_TIMELINE_SURFACE_CAPABILITIES,
  threadDetailLevel = "STEPS_COMMANDS",
}: ConversationProps) {
  const entries = useMemo(() => timeline === null ? [] : groupTimelineFramesByTurn(timeline), [timeline]);
  const latestTurn = entries.length === 0 ? null : entries[entries.length - 1] ?? null;
  const latestTurnKey = latestTurn?.turnKey ?? null;
  const latestTurnPhase = deriveTimelineLatestTurnPhase(latestTurn);
  const isLatestTurnInProgress = latestTurn?.status === "pending" || latestTurn?.status === "streaming";
  const [measuredFooterScrollPaddingPx, setMeasuredFooterScrollPaddingPx] = useState(
    Math.max(0, suppliedBottomScrollPaddingPx),
  );
  const bottomScrollPaddingPx = footer === undefined
    ? Math.max(0, suppliedBottomScrollPaddingPx)
    : measuredFooterScrollPaddingPx;
  const [measuredHeightsByKey, setMeasuredHeightsByKey] = useState<Readonly<Record<string, number>>>(
    () => initialRestoreSnapshot?.virtualizedTurnList?.turnHeightsByKey ?? {},
  );
  const [activityCollapsedById, setActivityCollapsedById] = useState<Readonly<Record<string, boolean>>>(
    () => initialRestoreSnapshot?.agentActivityCollapsedById ?? {},
  );
  const activityCollapsedByIdRef = useRef(activityCollapsedById);
  activityCollapsedByIdRef.current = activityCollapsedById;
  const handleActivityCollapsedChange = useCallback((id: string, collapsed: boolean) => {
    setActivityCollapsedById((current) => current[id] === collapsed
      ? current
      : { ...current, [id]: collapsed });
  }, []);
  const layout = useMemo(() => buildTurnLayout(entries, measuredHeightsByKey), [entries, measuredHeightsByKey]);
  const [viewport, setViewport] = useState<VirtualizedTurnViewportState>(() => createTurnViewportState(
    layout,
    distanceExcludingBottomPadding(
      normalizeInitialScrollDistance(initialRestoreSnapshot?.distanceFromBottomPx),
      bottomScrollPaddingPx,
    ),
    CODEX_TURN_VIRTUALIZER_CONFIG.fallbackViewportHeightPx,
    initialRestoreSnapshot?.virtualizedTurnList ?? null,
  ));
  const viewportOwnerRef = useRef<ReturnType<typeof createWebConversationViewportOwner> | null>(null);
  if (viewportOwnerRef.current === null) {
    viewportOwnerRef.current = createWebConversationViewportOwner(
      normalizeInitialScrollDistance(initialRestoreSnapshot?.distanceFromBottomPx),
    );
  }
  const viewportOwner = viewportOwnerRef.current;
  const scrollRef = viewportOwner.scrollElementRef;
  const rowElements = viewportOwner.turnElementsRef;
  const footerRef = useRef<HTMLDivElement>(null);
  const virtualizerSpacerRef = useRef<HTMLDivElement>(null);
  const responseSpacerElementRef = useRef<HTMLDivElement>(null);
  const scrollController = viewportOwner.scrollController;
  const handleReflowAnchorCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    viewportOwner.captureReflowAnchor(event.target);
  }, [viewportOwner]);
  const pendingMeasurementTransactionRef = useRef<TurnMeasurementTransaction | null>(null);
  const measurementCommittedHeightsRef = useRef<Readonly<Record<string, number>> | null>(null);
  const pendingScrollRequestRef = useRef<PendingScrollRequest | null>(null);
  const [pendingScrollRequest, setPendingScrollRequest] = useState<PendingScrollRequest | null>(null);
  const cancelPendingTargetPosition = useCallback(() => {
    const request = pendingScrollRequestRef.current;
    if (request === null) return;
    pendingScrollRequestRef.current = null;
    setPendingScrollRequest((current) => current === request ? null : current);
    request.complete("cancelled");
  }, []);
  const previousLayout = useRef(layout);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const measuredHeightsRef = useRef(measuredHeightsByKey);
  measuredHeightsRef.current = measuredHeightsByKey;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const distanceRef = useRef(scrollController.getLastScrollDistanceFromBottomPx());
  const bottomPaddingRef = useRef(bottomScrollPaddingPx);
  bottomPaddingRef.current = bottomScrollPaddingPx;
  const restoredFollow = initialRestoreSnapshot?.turnFollow?.turnKey === latestTurnKey
    ? initialRestoreSnapshot.turnFollow.followMode
    : null;
  const followStateRef = useRef(createInitialTurnFollowState({
    distanceFromBottomPx: distanceRef.current,
    isLatestTurnInProgress,
    latestTurnPhase,
    restoredFollowMode: restoredFollow,
  }));
  const latestTurnKeyRef = useRef(latestTurnKey);
  const latestTurnPhaseRef = useRef(latestTurnPhase);
  const latestTurnInProgressRef = useRef(isLatestTurnInProgress);
  const measurementLatestTurnInProgressRef = useRef(isLatestTurnInProgress);
  measurementLatestTurnInProgressRef.current = isLatestTurnInProgress;
  const latestTurnHeightRef = useRef<number | null>(
    initialRestoreSnapshot?.turnFollow?.turnKey === latestTurnKey
      ? initialRestoreSnapshot.turnFollow.latestTurnHeightPx
      : null,
  );
  const latestTurnFollowContentHeightRef = useRef<number | null>(
    initialRestoreSnapshot?.turnFollow?.turnKey === latestTurnKey
      ? initialRestoreSnapshot.turnFollow.latestTurnFollowContentHeightPx
      : null,
  );
  const mountedRef = useRef(false);
  const inputDirectionRef = useRef<ScrollDirectionSample | null>(null);
  const previousPointerSnapshotRef = useRef<{ scrollHeightPx: number; scrollTopPx: number } | null>(null);
  const touchPointRef = useRef<{ identifier: number; x: number; y: number } | null>(null);
  const pendingLatestTurnPlacementRef = useRef<ReturnType<typeof createLatestTurnPlacementSnapshot> | null>(null);
  const footerResizeViewportPreserveDisabledRef = useRef(false);
  const previousFooterHeightRef = useRef<number | null>(null);
  const restoreStateRef = useRef(createTurnRestoreState(
    normalizeInitialScrollDistance(initialRestoreSnapshot?.distanceFromBottomPx),
  ));
  const responseSpacerIntersectsBottomRef = useRef(false);
  const visibleContentReadyRef = useRef(false);
  const responseSpacerHeight = useMotionValue(0);
  const latestTurnOffset = useMotionValue(0);
  const responseSpacerAnimationRef = useRef<AnimationPlaybackControls | null>(null);
  const latestTurnOffsetAnimationRef = useRef<AnimationPlaybackControls | null>(null);

  const stopResponseAnimations = useCallback((clearSpacer: boolean) => {
    responseSpacerAnimationRef.current?.stop();
    responseSpacerAnimationRef.current = null;
    latestTurnOffsetAnimationRef.current?.stop();
    latestTurnOffsetAnimationRef.current = null;
    latestTurnOffset.set(0);
    if (clearSpacer) responseSpacerHeight.set(0);
  }, [latestTurnOffset, responseSpacerHeight]);

  const updateFooterPreservationPolicy = useCallback(() => {
    footerResizeViewportPreserveDisabledRef.current = isLatestTurnInProgress
      && isViewportPreservingTurnFollowMode(followStateRef.current.followMode);
  }, [isLatestTurnInProgress]);

  const setFollowState = useCallback((event: Parameters<typeof reduceTurnFollowState>[1]) => {
    followStateRef.current = reduceTurnFollowState(followStateRef.current, event);
    updateFooterPreservationPolicy();
    return followStateRef.current;
  }, [updateFooterPreservationPolicy]);

  const historyBackfill = useTurnHistoryBackfill({
    historyKey: timeline === null
      ? null
      : JSON.stringify([timeline.key.hostId, timeline.key.threadId]),
    loadPage: onLoadOlder,
    readMetrics: () => {
      const element = scrollRef.current;
      return element === null
        ? null
        : {
            distanceFromBottomPx: distanceFromBottom(element),
            viewportHeightPx: element.clientHeight,
            scrollHeightPx: element.scrollHeight,
          };
    },
    afterLayout: () => new Promise<void>((resolve) => window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    })),
  });
  const loadOlderUntilScrollable = historyBackfill.request;

  const updateVirtualViewport = useCallback((distance: number, element: HTMLDivElement) => {
    const virtualDistance = distanceExcludingBottomPadding(distance, bottomPaddingRef.current);
    setViewport((current) => updateTurnViewportState(
      current,
      layoutRef.current,
      virtualDistance,
      element.clientHeight,
    ));
  }, []);

  const shrinkResponseSpacer = useCallback((requestedHeightPx: number) => {
    const currentHeight = responseSpacerHeight.get();
    const nextHeight = requestedHeightPx <= 24
      ? 0
      : Math.min(currentHeight, Math.max(0, requestedHeightPx));
    if (currentHeight - nextHeight <= 24) return;
    stopResponseAnimations(false);
    responseSpacerHeight.set(nextHeight);
    const element = scrollRef.current;
    if (element === null) return;
    const nextDistance = Math.max(0, distanceFromBottom(element) + nextHeight - currentHeight);
    scrollController.scrollToDistanceFromBottomPx(nextDistance, "instant");
    distanceRef.current = nextDistance;
    updateVirtualViewport(nextDistance, element);
  }, [responseSpacerHeight, scrollController, stopResponseAnimations, updateVirtualViewport]);

  const handleUserScroll = useCallback((distance: number, previousDistance: number) => {
    restoreStateRef.current = reduceTurnRestoreState(
      restoreStateRef.current,
      { type: "user_takeover" },
    ).state;
    const spacerHeight = responseSpacerHeight.get();
    if (distance <= 24) {
      if (
        (spacerHeight <= 24 || responseSpacerIntersectsBottomRef.current)
        && previousDistance > 24
        && isLatestTurnInProgress
      ) {
        setFollowState({ type: "scroll_to_bottom", latestTurnPhase });
        scrollController.scrollToDistanceFromBottomPx(0, "instant");
      }
      return;
    }
    setFollowState({
      type: "scroll_distance_changed",
      distanceFromBottomPx: distance,
      latestTurnPhase,
    });
    if (
      spacerHeight > 24
      && (
        (!isLatestTurnInProgress && latestTurnPhase === "idle")
        || (isLatestTurnInProgress && distance > previousDistance)
      )
    ) shrinkResponseSpacer(spacerHeight - distance);
  }, [isLatestTurnInProgress, latestTurnPhase, responseSpacerHeight, scrollController, setFollowState, shrinkResponseSpacer]);

  const updateFromElement = useStableEvent((origin: "user" | "system") => {
    const element = scrollRef.current;
    if (element === null) return;
    const previousDistance = distanceRef.current;
    const snapshot = scrollController.reportPlatformScroll(origin);
    const distance = snapshot.distanceFromBottomPx;
    distanceRef.current = distance;
    const spacerHeight = responseSpacerHeight.get();
    if (
      distance > 24
      && isLatestTurnInProgress
      && spacerHeight > 24
      && responseSpacerOverflowPx({
        distanceFromBottomPx: distance,
        responseSpacerHeightPx: spacerHeight,
        scrollPaddingBottomPx: bottomPaddingRef.current,
      }) <= 24
    ) responseSpacerIntersectsBottomRef.current = true;
    if (origin === "user" && distance !== previousDistance) handleUserScroll(distance, previousDistance);
    updateVirtualViewport(distance, element);
    if (origin === "user" && shouldLoadOlderHistory({
      contentHeightPx: element.scrollHeight,
      distanceFromBottomPx: distance,
      viewportHeightPx: element.clientHeight,
    })) {
      void loadOlderUntilScrollable();
    }
  });

  const virtualizedTurnListApi = useMemo<VirtualizedTurnListApi>(() => ({
    getEntryGeometry: (turnKey) => getTurnGeometry(layoutRef.current, turnKey),
    getViewportState: () => viewportRef.current,
    positionTarget: (options) => new Promise((resolve) => {
      cancelPendingTargetPosition();
      if (options.signal?.aborted === true) {
        resolve("cancelled");
        return;
      }
      let settled = false;
      let request: PendingScrollRequest;
      const handleAbort = () => {
        if (pendingScrollRequestRef.current === request) pendingScrollRequestRef.current = null;
        setPendingScrollRequest((current) => current === request ? null : current);
        request.complete("cancelled");
      };
      request = {
        align: options.align ?? "center",
        behavior: options.behavior ?? "instant",
        cancelSettlement: null,
        complete: (result) => {
          if (settled) return;
          settled = true;
          request.cancelSettlement?.();
          request.cancelSettlement = null;
          options.signal?.removeEventListener("abort", handleAbort);
          resolve(result);
        },
        minimumTimelineRevision: Math.max(0, options.minimumTimelineRevision ?? 0),
        phase: "awaiting-render",
        targetKey: options.targetKey,
        topAlignmentInsetPx: options.topAlignmentInsetPx,
        turnKey: options.turnKey,
      };
      options.signal?.addEventListener("abort", handleAbort, { once: true });
      pendingScrollRequestRef.current = request;
      setPendingScrollRequest(request);
    }),
  }), [cancelPendingTargetPosition]);

  useEffect(() => {
    onVirtualizedTurnListApiChange?.(virtualizedTurnListApi);
    return () => onVirtualizedTurnListApiChange?.(null);
  }, [onVirtualizedTurnListApiChange, virtualizedTurnListApi]);

  const conversationScrollApi = useMemo<ConversationScrollApi>(() => ({
    clearPendingLatestTurnSubmitPlacement: () => {
      pendingLatestTurnPlacementRef.current = null;
      updateFooterPreservationPolicy();
    },
    prepareLatestTurnSubmitPlacement: () => {
      const element = scrollRef.current;
      pendingLatestTurnPlacementRef.current = createLatestTurnPlacementSnapshot({
        distanceFromBottomPx: distanceRef.current,
        responseSpacerHeightPx: responseSpacerHeight.get(),
        scrollHeightPx: element?.scrollHeight ?? 0,
      });
      footerResizeViewportPreserveDisabledRef.current = true;
    },
    scrollToBottom: () => {
      restoreStateRef.current = reduceTurnRestoreState(
        restoreStateRef.current,
        { type: "user_takeover" },
      ).state;
      if (isLatestTurnInProgress) {
        stopResponseAnimations(true);
        setFollowState({ type: "scroll_to_bottom", latestTurnPhase });
        scrollController.scrollToDistanceFromBottomPx(0, "instant");
      } else if (latestTurnPhase === "idle" && responseSpacerHeight.get() > 24) {
        stopResponseAnimations(true);
        scrollController.scrollToDistanceFromBottomPx(0, "instant");
      } else {
        scrollController.scrollToBottom();
      }
    },
  }), [isLatestTurnInProgress, latestTurnPhase, responseSpacerHeight, scrollController, setFollowState, stopResponseAnimations, updateFooterPreservationPolicy]);

  const subscribeScrollToBottomVisibility = useCallback((listener: () => void) => {
    const unsubscribeScroll = scrollController.subscribe(listener);
    const unsubscribeSpacer = responseSpacerHeight.on("change", () => listener());
    return () => {
      unsubscribeScroll();
      unsubscribeSpacer();
    };
  }, [responseSpacerHeight, scrollController]);
  const getScrollToBottomVisibility = useCallback(() => shouldShowScrollToBottomAction({
    isScrolledFromBottom: scrollController.getSnapshot().isScrolledFromBottom,
    responseSpacerHeightPx: responseSpacerHeight.get(),
    scrollDistanceFromBottomPx: scrollController.getLastScrollDistanceFromBottomPx(),
  }), [responseSpacerHeight, scrollController]);
  const showScrollToBottom = useSyncExternalStore(
    subscribeScrollToBottomVisibility,
    getScrollToBottomVisibility,
    getScrollToBottomVisibility,
  );

  useEffect(() => {
    onConversationScrollApiChange?.(conversationScrollApi);
    return () => onConversationScrollApiChange?.(null);
  }, [conversationScrollApi, onConversationScrollApiChange]);

  useLayoutEffect(updateFooterPreservationPolicy, [updateFooterPreservationPolicy]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element !== null) updateFromElement("system");
  }, [bottomScrollPaddingPx, updateFromElement]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) return;
    const markDirection = (direction: "away" | "toward" | null) => {
      cancelPendingTargetPosition();
      scrollController.cancelScrollAnimation();
      if (direction === null) {
        inputDirectionRef.current = null;
        return;
      }
      const currentDistance = distanceFromBottom(element);
      const canMove = direction === "away"
        ? distanceFromTopPx({
            contentHeightPx: element.scrollHeight,
            distanceFromBottomPx: currentDistance,
            viewportHeightPx: element.clientHeight,
          }) > 0
        : currentDistance > 0;
      inputDirectionRef.current = canMove ? { direction, lastAtMs: performance.now() } : null;
    };
    const handleWheel = (event: WheelEvent) => {
      const delta = normalizeWheelDeltaPx(
        event.deltaY,
        event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 1 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 2 : 0,
        element.clientHeight,
      );
      scrollController.recordWheelDelta(delta);
      markDirection(directionForWheelDelta(delta));
      if (event.deltaY < 0 && distanceFromTopPx({
        contentHeightPx: element.scrollHeight,
        distanceFromBottomPx: distanceFromBottom(element),
        viewportHeightPx: element.clientHeight,
      }) <= 0) void loadOlderUntilScrollable();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement
        && target !== element
        && (
          target.isContentEditable
          || target.closest("input, select, textarea") !== null
          || ((event.key === " " || event.key === "Spacebar") && target.closest("button, [role='button']") !== null)
        )
      ) return;
      const direction = keyboardScrollDirection(event);
      if (direction !== null) {
        scrollController.cancelPendingLayoutPreservation();
        markDirection(direction);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      cancelPendingTargetPosition();
      inputDirectionRef.current = null;
      previousPointerSnapshotRef.current = event.pointerType === "mouse" && event.target === element
        ? { scrollHeightPx: element.scrollHeight, scrollTopPx: element.scrollTop }
        : null;
      if (event.pointerType === "mouse" && event.target === element) {
        scrollController.cancelPendingLayoutPreservation();
      }
      scrollController.cancelScrollAnimation();
    };
    const clearPointer = () => { previousPointerSnapshotRef.current = null; };
    const handleTouchStart = (event: TouchEvent) => {
      cancelPendingTargetPosition();
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      touchPointRef.current = touch === undefined ? null : {
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      };
    };
    const handleTouchMove = (event: TouchEvent) => {
      const previous = touchPointRef.current;
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      if (previous === null || touch === undefined || touch.identifier !== previous.identifier) {
        touchPointRef.current = null;
        return;
      }
      const direction = directionForTouchDelta(touch.clientX - previous.x, touch.clientY - previous.y);
      if (direction !== null) {
        touchPointRef.current = null;
        scrollController.cancelPendingLayoutPreservation();
        markDirection(direction);
        if (direction === "away" && distanceFromTopPx({
          contentHeightPx: element.scrollHeight,
          distanceFromBottomPx: distanceFromBottom(element),
          viewportHeightPx: element.clientHeight,
        }) <= 0) void loadOlderUntilScrollable();
      }
    };
    const clearTouch = () => { touchPointRef.current = null; };
    const handleScroll = () => {
      const nextDistance = distanceFromBottom(element);
      const pointerSnapshot = previousPointerSnapshotRef.current;
      if (
        pointerSnapshot !== null
        && pointerSnapshot.scrollHeightPx === element.scrollHeight
        && pointerSnapshot.scrollTopPx !== element.scrollTop
      ) {
        markDirection(nextDistance > distanceRef.current ? "away" : nextDistance < distanceRef.current ? "toward" : null);
        previousPointerSnapshotRef.current = null;
      }
      const now = performance.now();
      const origin = resolveScrollOrigin(
        inputDirectionRef.current,
        distanceRef.current,
        nextDistance,
        now,
      );
      updateFromElement(origin);
      if (origin === "user" && inputDirectionRef.current !== null) {
        inputDirectionRef.current = nextDistance <= 24
          ? null
          : { ...inputDirectionRef.current, lastAtMs: now };
      }
    };
    return viewportOwner.bindScrollPortListeners({
      keydown: handleKeyDown,
      pointercancel: clearPointer,
      pointerdown: handlePointerDown,
      pointerup: clearPointer,
      scroll: handleScroll,
      touchcancel: clearTouch,
      touchend: clearTouch,
      touchmove: handleTouchMove,
      touchstart: handleTouchStart,
      wheel: handleWheel,
    });
  }, [cancelPendingTargetPosition, loadOlderUntilScrollable, scrollController, updateFromElement, viewportOwner]);

  const restoreInitialPosition = useCallback(() => {
    const element = scrollRef.current;
    if (element === null) return;
    if (followStateRef.current.followMode === "prework_follow") {
      restoreStateRef.current = reduceTurnRestoreState(
        restoreStateRef.current,
        { type: "follow_mode_owned" },
      ).state;
      return;
    }
    let transition = reduceTurnRestoreState(restoreStateRef.current, {
      type: "attempt",
      observedDistanceFromBottomPx: distanceFromBottom(element),
    });
    restoreStateRef.current = transition.state;
    if (transition.scrollToDistanceFromBottomPx !== null) {
      scrollController.scrollToDistanceFromBottomPx(transition.scrollToDistanceFromBottomPx, "instant");
      transition = reduceTurnRestoreState(restoreStateRef.current, {
        type: "attempt",
        observedDistanceFromBottomPx: distanceFromBottom(element),
      });
      restoreStateRef.current = transition.state;
    }
  }, [scrollController]);

  useLayoutEffect(() => {
    const previous = previousLayout.current;
    previousLayout.current = layout;
    const measurementOwnsLayout = measurementCommittedHeightsRef.current === measuredHeightsByKey;
    if (measurementOwnsLayout) measurementCommittedHeightsRef.current = null;
    const element = scrollRef.current;
    if (element === null) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      scrollController.scrollToDistanceFromBottomPx(
        normalizeInitialScrollDistance(initialRestoreSnapshot?.distanceFromBottomPx),
        "instant",
      );
      if (isLatestTurnInProgress && initialRestoreSnapshot === null && latestTurnKey !== null) {
        setFollowState({ type: "latest_turn_placed" });
        const maximumSpacer = maximumResponseSpacerHeightPx({
          scrollElementHeightPx: element.clientHeight,
          scrollPaddingBottomPx: bottomPaddingRef.current,
        });
        latestTurnOffset.set(responseSpacerHeight.get());
        scrollController.scrollToDistanceFromBottomPx(1, "instant");
        latestTurnOffsetAnimationRef.current = animate(latestTurnOffset, 0, CODEX_LATEST_TURN_SPRING);
        responseSpacerAnimationRef.current = animate(
          responseSpacerHeight,
          maximumSpacer,
          CODEX_LATEST_TURN_SPRING,
        );
      }
      restoreInitialPosition();
      updateFromElement("system");
      return;
    }

    const previousLatestTurnKey = latestTurnKeyRef.current;
    const previousLatestTurnPhase = latestTurnPhaseRef.current;
    latestTurnKeyRef.current = latestTurnKey;
    latestTurnPhaseRef.current = latestTurnPhase;

    const previousInProgress = latestTurnInProgressRef.current;
    latestTurnInProgressRef.current = isLatestTurnInProgress;
    let handledLatestTurnLayout = false;

    if (previousLatestTurnKey !== latestTurnKey) {
      latestTurnHeightRef.current = latestTurnKey === null ? null : measuredHeightsByKey[latestTurnKey] ?? null;
      latestTurnFollowContentHeightRef.current = latestTurnHeightRef.current;
      if (latestTurnKey === null) {
        setFollowState({ type: "latest_turn_removed" });
        stopResponseAnimations(true);
      } else {
        const placement = pendingLatestTurnPlacementRef.current;
        pendingLatestTurnPlacementRef.current = null;
        setFollowState({ type: "latest_turn_placed" });
        const shouldPlace = shouldPlaceLatestTurnFromPendingSubmit(placement);
        handledLatestTurnLayout = true;
        if (!shouldPlace) {
          stopResponseAnimations(true);
          if (placement !== null) {
            const addedScrollHeight = Math.max(0, element.scrollHeight - placement.scrollHeightPx);
            scrollController.scrollToDistanceFromBottomPx(
              placement.distanceFromBottomPx + addedScrollHeight,
              "instant",
            );
          }
        } else {
          const maximumSpacer = maximumResponseSpacerHeightPx({
            scrollElementHeightPx: element.clientHeight,
            scrollPaddingBottomPx: bottomPaddingRef.current,
          });
          const currentSpacer = responseSpacerHeight.get();
          responseSpacerAnimationRef.current?.stop();
          latestTurnOffsetAnimationRef.current?.stop();
          latestTurnOffset.set(currentSpacer);
          scrollController.scrollToDistanceFromBottomPx(1, "instant");
          latestTurnOffsetAnimationRef.current = animate(latestTurnOffset, 0, CODEX_LATEST_TURN_SPRING);
          if (currentSpacer !== maximumSpacer) {
            responseSpacerAnimationRef.current = animate(
              responseSpacerHeight,
              maximumSpacer,
              CODEX_LATEST_TURN_SPRING,
            );
          }
        }
      }
    }
    if (previousLatestTurnPhase !== latestTurnPhase) {
      const previousFollowMode = followStateRef.current.followMode;
      setFollowState({
        type: "latest_turn_phase_changed",
        previousLatestTurnPhase,
        latestTurnPhase,
      });
      if (
        previousLatestTurnPhase === "prework"
        && latestTurnPhase === "final_answer"
        && previousFollowMode === "prework_follow"
      ) {
        stopResponseAnimations(true);
        scrollController.scrollToDistanceFromBottomPx(0, "instant");
        handledLatestTurnLayout = true;
      }
    }

    if (shouldFollowLatestTurn(followStateRef.current, latestTurnPhase)) {
      scrollController.scrollToDistanceFromBottomPx(0, "instant");
      handledLatestTurnLayout = true;
    } else if (!measurementOwnsLayout && latestTurnKey !== null && previousLatestTurnKey === latestTurnKey) {
      const nextLatestHeight = measuredHeightsByKey[latestTurnKey] ?? null;
      const previousLatestHeight = latestTurnHeightRef.current;
      latestTurnHeightRef.current = nextLatestHeight;
      latestTurnFollowContentHeightRef.current = nextLatestHeight;
      if (
        nextLatestHeight !== null
        && previousLatestHeight !== null
        && Math.abs(nextLatestHeight - previousLatestHeight) > 0.5
      ) {
        const heightDelta = nextLatestHeight - previousLatestHeight;
        if (
          restoreStateRef.current.phase === "pending"
          && Math.abs(heightDelta) > 24
        ) {
          restoreStateRef.current = reduceTurnRestoreState(
            restoreStateRef.current,
            { type: "height_delta_below_viewport", heightDeltaPx: heightDelta },
          ).state;
        }
        const currentDistance = distanceFromBottom(element);
        const nextDistance = distanceAfterLatestTurnHeightChange({
          bottomPaddingPx: bottomPaddingRef.current,
          currentDistanceFromBottomPx: currentDistance,
          heightDeltaPx: heightDelta,
        });
        if (isLatestTurnInProgress && responseSpacerHeight.get() > 24 && nextDistance < 0) {
          responseSpacerHeight.set(responseSpacerHeight.get() - nextDistance);
        }
        scrollController.scrollToDistanceFromBottomPx(Math.max(0, nextDistance), "instant");
        handledLatestTurnLayout = true;
      }

      if (followStateRef.current.followMode === "prework_watch") {
        const latestElement = rowElements.current.get(latestTurnKey);
        if (latestElement !== undefined) {
          const overflow = latestElement.getBoundingClientRect().bottom
            - element.getBoundingClientRect().bottom
            + bottomPaddingRef.current;
          const nextFollowState = setFollowState({
            type: "latest_turn_follow_content_changed",
            latestTurnPhase,
            followContentOverflowPx: overflow,
          });
          if (nextFollowState.followMode === "prework_follow") {
            stopResponseAnimations(true);
            scrollController.scrollToDistanceFromBottomPx(0, "instant");
            handledLatestTurnLayout = true;
          }
        }
      }
    }

    if (
      !handledLatestTurnLayout
      && !measurementOwnsLayout
      && !isLatestTurnInProgress
      && restoreStateRef.current.phase === "settled"
    ) {
      const rawDistance = scrollController.getLastScrollDistanceFromBottomPx();
      const virtualDistance = distanceExcludingBottomPadding(rawDistance, bottomPaddingRef.current);
      const isAtVirtualizedBottom = rawDistance <= (bottomPaddingRef.current > 0 ? 0 : 24);
      if (!isAtVirtualizedBottom) {
        const anchorKey = findMeasuredViewportAnchor(
          previous,
          layout,
          measuredHeightsByKey,
          virtualDistance,
          element.clientHeight,
        );
        const compensated = anchorKey === null
          ? null
          : compensateDistanceFromBottom(anchorKey, virtualDistance, previous, layout);
        if (compensated !== null && compensated !== virtualDistance) {
          scrollController.compensateScrollToDistanceFromBottomPx(
            compensated + bottomPaddingRef.current,
          );
        }
      }
    }
    if (previousInProgress && !isLatestTurnInProgress) {
      responseSpacerAnimationRef.current?.stop();
      latestTurnOffsetAnimationRef.current?.stop();
      latestTurnOffset.set(0);
    }
    restoreInitialPosition();
    updateFromElement("system");
  }, [initialRestoreSnapshot?.distanceFromBottomPx, isLatestTurnInProgress, latestTurnKey, latestTurnOffset, latestTurnPhase, layout, measuredHeightsByKey, responseSpacerHeight, restoreInitialPosition, scrollController, setFollowState, stopResponseAnimations, updateFromElement]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) return;
    historyBackfill.invalidate();
    const update = () => {
      const clientHeightPx = element.clientHeight;
      const spacer = responseSpacerHeight.get();
      if (spacer > 24) {
        const maximum = maximumResponseSpacerHeightPx({
          scrollElementHeightPx: clientHeightPx,
          scrollPaddingBottomPx: bottomPaddingRef.current,
        });
        if (Math.abs(Math.min(spacer, maximum) - spacer) > 24) {
          shrinkResponseSpacer(maximum);
        }
      }
      restoreInitialPosition();
      updateFromElement("system");
      void loadOlderUntilScrollable();
    };
    const release = viewportOwner.observeViewportGeometry(update);
    return () => {
      historyBackfill.invalidate();
      release();
    };
  }, [historyBackfill, loadOlderUntilScrollable, responseSpacerHeight, restoreInitialPosition, shrinkResponseSpacer, updateFromElement, viewportOwner]);

  useLayoutEffect(() => {
    const footerElement = footerRef.current;
    const scrollElement = scrollRef.current;
    if (footerElement === null || scrollElement === null || footer === undefined) {
      setMeasuredFooterScrollPaddingPx(Math.max(0, suppliedBottomScrollPaddingPx));
      return;
    }
    const measure = (height: number) => {
      const previousHeight = previousFooterHeightRef.current;
      previousFooterHeightRef.current = height;
      const padding = footerScrollPaddingPx(height);
      scrollElement.style.setProperty("--thread-scroll-padding-bottom", `${padding}px`);
      setMeasuredFooterScrollPaddingPx(padding);
      const compensated = footerResizeCompensation({
        currentDistanceFromBottomPx: distanceFromBottom(scrollElement),
        footerResizeViewportPreserveDisabled: footerResizeViewportPreserveDisabledRef.current,
        isScrollAnimationActive: scrollController.getSnapshot().isScrollAnimationActive,
        nextFooterHeightPx: height,
        previousFooterHeightPx: previousHeight,
      });
      if (compensated !== null) {
        scrollController.scrollToDistanceFromBottomPx(compensated, "instant");
      }
    };
    return viewportOwner.observeFooterHeight(footerElement, measure);
  }, [footer, scrollController, suppliedBottomScrollPaddingPx, viewportOwner]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    const spacer = responseSpacerElementRef.current;
    if (element === null || spacer === null || typeof IntersectionObserver === "undefined") return;
    return viewportOwner.observeResponseSpacer(spacer, (record) => {
      if (latestTurnInProgressRef.current) {
        responseSpacerIntersectsBottomRef.current = Math.max(
          0,
          record.intersectionRect.height - bottomPaddingRef.current,
        ) <= 24;
      } else {
        shrinkResponseSpacer(Math.min(
          record.intersectionRect.height,
          responseSpacerHeight.get() - distanceFromBottom(element),
        ));
      }
    });
  }, [responseSpacerHeight, shrinkResponseSpacer, viewportOwner]);

  const commitTurnMeasurements = useStableEvent((
    measurements: readonly { readonly turnKey: string; readonly heightPx: number }[],
  ) => {
    const transaction = createTurnMeasurementTransaction({
      entries: entriesRef.current,
      measurements,
      measuredHeightsByKey: measuredHeightsRef.current,
      layout: layoutRef.current,
      viewport: viewportRef.current,
      currentDistanceFromBottomPx: distanceRef.current,
      bottomPaddingPx: bottomPaddingRef.current,
      preserveMeasuredTurnViewport: !measurementLatestTurnInProgressRef.current,
      pendingRestoreScrollDistanceFromBottomPx: restoreStateRef.current.phase === "pending"
        ? restoreStateRef.current.distanceFromBottomPx
        : null,
      previousPendingTransaction: pendingMeasurementTransactionRef.current,
    });
    if (transaction === null) return;
    pendingMeasurementTransactionRef.current = transaction;
    measuredHeightsRef.current = transaction.measuredHeightsByKey;
    layoutRef.current = transaction.layout;
    viewportRef.current = transaction.viewport;
    measurementCommittedHeightsRef.current = transaction.measuredHeightsByKey;

    if (transaction.preservePlatformScrollForNextLayout) {
      scrollController.preserveScrollPositionForNextLayout();
    }

    const commit = () => {
      setMeasuredHeightsByKey(transaction.measuredHeightsByKey);
      if (transaction.viewport !== viewportRef.current) setViewport(transaction.viewport);
      else setViewport((current) => current === transaction.viewport ? current : transaction.viewport);
    };

    if (transaction.canUseLatestTurnFastPath && virtualizerSpacerRef.current !== null) {
      virtualizerSpacerRef.current.style.height = `${transaction.layout.totalHeightPx}px`;
      commit();
    } else {
      flushSync(commit);
    }

    const latestChange = transaction.latestTurnHeightChange;
    if (latestChange !== null) {
      latestTurnHeightRef.current = latestChange.heightPx;
      latestTurnFollowContentHeightRef.current = latestChange.heightPx;
      if (restoreStateRef.current.phase === "pending" && Math.abs(latestChange.heightDeltaPx) > 24) {
        restoreStateRef.current = reduceTurnRestoreState(
          restoreStateRef.current,
          { type: "height_delta_below_viewport", heightDeltaPx: latestChange.heightDeltaPx },
        ).state;
      }
    }
    if (transaction.restoreScrollDistanceFromBottom) {
      restoreInitialPosition();
    } else if (transaction.scrollDistanceFromBottomPx !== null) {
      scrollController.compensateScrollToDistanceFromBottomPx(
        transaction.scrollDistanceFromBottomPx,
      );
    }
    pendingMeasurementTransactionRef.current = null;
  });
  useLayoutEffect(() => {
    viewportOwner.setMeasurementListener(({ measurements }) => {
      commitTurnMeasurements(measurements);
    });
    return () => viewportOwner.setMeasurementListener(null);
  }, [commitTurnMeasurements, viewportOwner]);
  const observeTurn = viewportOwner.observeTurn;

  useLayoutEffect(() => {
    const request = pendingScrollRequest;
    const element = scrollRef.current;
    if (request === null || element === null) return;
    if (request.phase === "scrolling") return;
    const timelineRevision = timeline?.revision ?? -1;
    if (timelineRevision < request.minimumTimelineRevision) return;
    const immediateMeasurements = viewportOwner.measureMountedTurns();
    let changed = false;
    for (const [turnKey, height] of Object.entries(immediateMeasurements)) {
      if (Math.abs((measuredHeightsRef.current[turnKey] ?? 0) - height) > 0.5) changed = true;
    }
    if (changed) {
      setMeasuredHeightsByKey((current) => ({ ...current, ...immediateMeasurements }));
      return;
    }
    const currentLayout = layoutRef.current;
    const turnElement = viewportOwner.getTurnElement(request.turnKey);
    // A navigation request is a renderer transaction, not an estimated layout
    // command. Pending state mounts the remote Turn offscreen. Until the exact
    // Turn and requested Item both exist in the committed DOM, keep waiting;
    // completing against the 280px estimate makes the first click inaccurate.
    if (turnElement === null) {
      pendingScrollRequestRef.current = null;
      request.complete("unavailable");
      setPendingScrollRequest((current) => current === request ? null : current);
      return;
    }
    const targetElement = request.targetKey === undefined
      ? turnElement
      : [...turnElement.querySelectorAll<HTMLElement>("[data-content-search-unit-key]")]
        .find((candidate) => candidate.dataset.contentSearchUnitKey === request.targetKey) ?? null;
    if (targetElement === null) {
      pendingScrollRequestRef.current = null;
      request.complete("unavailable");
      setPendingScrollRequest((current) => current === request ? null : current);
      return;
    }
    const turnRect = turnElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const distance = distanceFromBottomToTargetWithinTurn({
      align: request.align,
      layout: currentLayout,
      targetHeightPx: targetRect.height,
      targetTopOffsetWithinTurnPx: targetRect.top - turnRect.top,
      topAlignmentInsetPx: request.topAlignmentInsetPx,
      turnKey: request.turnKey,
      viewportHeightPx: element.clientHeight,
    });
    if (distance === null) return;
    const destinationDistance = Math.min(
      Math.max(0, element.scrollHeight - element.clientHeight),
      distance + bottomPaddingRef.current,
    );
    followStateRef.current = createTurnFollowState("static");
    const finishPositioning = () => {
      queueMicrotask(() => {
        if (pendingScrollRequestRef.current !== request) return;
        pendingScrollRequestRef.current = null;
        request.complete("positioned");
        setPendingScrollRequest((current) => current === request ? null : current);
      });
    };
    if (request.behavior === "smooth") {
      request.phase = "scrolling";
      request.cancelSettlement = scrollController.subscribe((metrics) => {
        if (Math.abs(metrics.distanceFromBottomPx - destinationDistance) <= 1) finishPositioning();
      });
    }
    scrollController.scrollToDistanceFromBottomPx(
      destinationDistance,
      request.behavior,
      "user",
    );
    updateVirtualViewport(destinationDistance, element);
    if (request.behavior === "instant") finishPositioning();
  }, [layout, pendingScrollRequest, scrollController, timeline?.revision, updateVirtualViewport]);

  useEffect(() => {
    if (
      onVisibleContentReady === undefined
      || visibleContentReadyRef.current
      || (entries.length > 0 && rowElements.current.size === 0)
    ) return;
    let secondFrame: number | null = null;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (visibleContentReadyRef.current || (entriesRef.current.length > 0 && rowElements.current.size === 0)) return;
        visibleContentReadyRef.current = true;
        restoreInitialPosition();
        onVisibleContentReady();
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
    };
  }, [entries.length, onVisibleContentReady, restoreInitialPosition, viewport.renderedRange]);

  const restoreCallbackRef = useRef(onRestoreSnapshotChange);
  restoreCallbackRef.current = onRestoreSnapshotChange;
  useEffect(() => () => {
    cancelPendingTargetPosition();
    const element = scrollRef.current;
    const normalized = normalizeFollowRestorePosition({
      distanceFromBottomPx: element === null
        ? scrollController.getLastScrollDistanceFromBottomPx()
        : distanceFromBottom(element),
      latestTurnPhase: latestTurnPhaseRef.current,
      responseSpacerHeightPx: responseSpacerHeight.get(),
      scrollPaddingBottomPx: bottomPaddingRef.current,
      scrollState: followStateRef.current,
    });
    const currentLayout = layoutRef.current;
    const currentViewport = viewportRef.current;
    const currentLatestTurnKey = latestTurnKeyRef.current;
    restoreCallbackRef.current?.({
      agentActivityCollapsedById: activityCollapsedByIdRef.current,
      distanceFromBottomPx: normalized.distanceFromBottomPx,
      virtualizedTurnList: serializeTurnRestoreState(
        measuredHeightsRef.current,
        currentLayout.turnKeys,
        currentViewport.renderedRange,
      ),
      turnFollow: currentLatestTurnKey === null ? null : {
        turnKey: currentLatestTurnKey,
        isLatestTurnInProgress: latestTurnInProgressRef.current,
        latestTurnPhase: latestTurnPhaseRef.current,
        followMode: normalized.scrollState.followMode,
        latestTurnHeightPx: isViewportPreservingTurnFollowMode(normalized.scrollState.followMode)
          ? latestTurnHeightRef.current
          : null,
        latestTurnFollowContentHeightPx: latestTurnFollowContentHeightRef.current,
      },
    });
    viewportOwner.dispose();
  }, [cancelPendingTargetPosition, responseSpacerHeight, scrollController, viewportOwner]);

  let renderedRange = viewport.renderedRange;
  if (pendingScrollRequest !== null) {
    const targetDistance = pendingScrollRequest.align === "top"
      ? distanceFromBottomToTopTurn({
          layout,
          turnKey: pendingScrollRequest.turnKey,
          topAlignmentInsetPx: pendingScrollRequest.topAlignmentInsetPx,
          viewportHeightPx: viewport.viewportHeightPx,
        })
      : distanceFromBottomToCenterTurn(layout, pendingScrollRequest.turnKey, viewport.viewportHeightPx);
    if (targetDistance !== null) {
      renderedRange = computeTurnRange(
        layout,
        targetDistance,
        viewport.viewportHeightPx,
        CODEX_TURN_VIRTUALIZER_CONFIG.overscanTurnCount,
      );
    }
  } else {
    renderedRange = reconcileRenderedRangeForEntries(viewport, layout);
  }
  const windowSlice = createTurnWindowSlice(entries, layout, renderedRange);
  const interactionContext = useMemo<ConversationInteractionContextValue>(() => ({
    respond: onRespondInteraction ?? null,
  }), [onRespondInteraction]);
  const subagentNavigation = useMemo<SubagentNavigationContextValue>(() => ({
    open: onOpenSubagent ?? null,
  }), [onOpenSubagent]);
  const presentedDocumentContext = useMemo<ConversationDocumentContextValue>(() => ({
    ...documentContext,
    onMeasurementRequest: viewportOwner.requestLayoutMeasurement,
  }), [documentContext, viewportOwner]);
  const footerElement = footer === undefined ? null : (
    <div
      className="thread-scroll-footer"
      data-thread-scroll-footer="true"
      ref={footerRef}
    >
      <div aria-hidden="true" className="thread-scroll-footer__gradient" />
      <div
        className="thread-scroll-footer__content thread-layout-width"
        data-pip-obstacle="thread-footer"
      >
        <div className="thread-scroll-to-bottom-anchor">
          <ScrollToBottomButton
            label="Scroll to bottom"
            onClick={conversationScrollApi.scrollToBottom}
            show={showScrollToBottom}
            showWorkingDots={showScrollToBottom && isLatestTurnInProgress}
          />
        </div>
        {footer}
      </div>
    </div>
  );
  return (
    <ToolActivityPresenterContext.Provider value={toolActivityPresenterRegistry}>
      <ToolCallIconRendererContext.Provider value={renderToolCallIcon ?? null}>
        <ToolCallContentRendererContext.Provider value={renderToolCallContent ?? null}>
          <ConversationInteractionContext.Provider value={interactionContext}>
            <SubagentNavigationContext.Provider value={subagentNavigation}>
              <ConversationDocumentContext.Provider value={presentedDocumentContext}>
                <div
                  className="thread-scroll-layout"
                  data-live-embedded-surface={surfaceCapabilities.hasLiveEmbeddedSurface || undefined}
                >
                  <div
                    className="thread-scroll"
                    data-app-action-timeline-scroll=""
                    data-pip-anchor-host={surfaceCapabilities.pipAnchorHostId ?? undefined}
                    data-thread-find-target="conversation"
                    onClickCapture={handleReflowAnchorCapture}
                    ref={viewportOwner.attachScrollElement}
                    style={{ "--thread-scroll-padding-bottom": `${bottomScrollPaddingPx}px` } as CSSProperties}
                    tabIndex={0}
                  >
                    <motion.div
                      className="thread-scroll-surface"
                      style={{
                        x: surfaceCapabilities.wideContentOffsetPx,
                        "--thread-wide-block-inline-shift": `${Math.abs(surfaceCapabilities.wideContentOffsetPx)}px`,
                      } as CSSProperties}
                    >
                      <div
                        className="thread-content thread-layout-width"
                        data-mcp-app-portal-target={surfaceCapabilities.embeddedPortalTarget || undefined}
                        data-thread-user-message-navigation-content="true"
                      >
                        <div
                          className="thread-virtualizer-spacer"
                          ref={virtualizerSpacerRef}
                          style={{ height: windowSlice.totalHeightPx }}
                        >
                          <div
                            className="thread-virtualizer-window"
                            style={{ gap: windowSlice.gapPx, marginTop: windowSlice.marginTopPx }}
                          >
                            {windowSlice.entries.map((turn, sliceIndex) => {
                              const index = windowSlice.range.startIndex + sliceIndex;
                              const isLatest = index === entries.length - 1;
                              const constrained = !isLatest && measuredHeightsByKey[turn.turnKey] === undefined
                                ? layout.heightsPx[index]
                                : undefined;
                              return (
                                <div
                                  className="thread-virtualizer-row"
                                  key={turn.turnKey}
                                  style={constrained === undefined
                                    ? undefined
                                    : { height: constrained, overflow: "hidden" }}
                                >
                                  <div
                                    data-virtualized-turn-content=""
                                    ref={(element) => observeTurn(turn.turnKey, element)}
                                  >
                                    <TurnRenderErrorBoundary resetKey={turn.turnKey}>
                                      <AnimatedTurn
                                        activityCollapsedById={activityCollapsedById}
                                        isMostRecentTurn={isLatest}
                                        offset={isLatest ? latestTurnOffset : null}
                                        onActivityCollapsedChange={handleActivityCollapsedChange}
                                        onRetry={onContinueTurn === undefined || continuableTurnId !== turn.turnId
                                          ? undefined
                                          : () => onContinueTurn(turn.turnId)}
                                        threadDetailLevel={threadDetailLevel}
                                        turn={turn}
                                      />
                                    </TurnRenderErrorBoundary>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <motion.div
                          aria-hidden="true"
                          className="thread-response-spacer"
                          ref={responseSpacerElementRef}
                          style={{ height: responseSpacerHeight }}
                        />
                      </div>
                      {footerElement}
                    </motion.div>
                  </div>
                  {navigationSource !== null ? (
                    <UserMessageNavigationRail
                      getScrollElement={() => scrollRef.current}
                      source={navigationSource}
                      virtualizedTurnListApi={virtualizedTurnListApi}
                    />
                  ) : null}
                </div>
              </ConversationDocumentContext.Provider>
            </SubagentNavigationContext.Provider>
          </ConversationInteractionContext.Provider>
        </ToolCallContentRendererContext.Provider>
      </ToolCallIconRendererContext.Provider>
    </ToolActivityPresenterContext.Provider>
  );
}
