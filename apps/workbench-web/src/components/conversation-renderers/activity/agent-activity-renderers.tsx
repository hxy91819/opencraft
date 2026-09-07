import {
  deriveAgentActivityHeaderPresentation,
  formatHookEventName,
  formatHookSource,
  isVisibleAgentActivityRow,
  resolveAgentActivityLayout,
  type AgentActivityContentUnit,
  type AgentActivityGroupContentUnit,
  type AgentActivityHeaderSummary,
  type AgentActivityRenderUnit,
  type HookStats,
  type TimelineBlock,
} from "@opencraft/chat-core";
import { TimelineBlockView } from "@opencraft/timeline-render-react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Fragment,
  useContext,
  useId,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { AgentActivityGroupDisclosure } from "../../agent-activity-group-disclosure";
import { activityIcon } from "./activity-icon";
import {
  CadencedShimmer,
} from "./activity-disclosure";
import { SubagentActivityGroup } from "../tool/tool-renderers";
import { ToolActivityPresenterContext } from "../render-contexts";

function GenericBlock({ block, onRetry, richText = true }: { block: TimelineBlock; onRetry?: () => void; richText?: boolean }): ReactNode {
  return <TimelineBlockView block={block} onRetry={onRetry} richText={richText} />;
}

function formatWorkedDuration(durationMs: number | null): string | null {
  if (durationMs === null || durationMs < 0) return null;
  if (durationMs < 1_000) return "less than a second";
  const seconds = Math.round(durationMs / 1_000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function AgentActivitySummaryView({ summary }: { readonly summary: AgentActivityHeaderSummary }) {
  if (summary.kind === "text") return <>{summary.text}</>;
  if (summary.parts.length === 0) return <>Worked</>;
  return (
    <span className="thread-agent-activity__summary-parts">
      {summary.parts.map((part, index) => (
        <span data-summary-kind={part.kind} key={part.key}>
          {index > 0 ? (
            <span aria-hidden="true" className="thread-agent-activity__summary-separator">
              {index === summary.parts.length - 1 ? (summary.parts.length === 2 ? " and " : ", and ") : ", "}
            </span>
          ) : null}
          <span data-source-count={part.sources.length || undefined}>{index === 0 ? part.text : part.text.charAt(0).toLocaleLowerCase() + part.text.slice(1)}</span>
        </span>
      ))}
    </span>
  );
}

function AgentActivityGroup({
  group,
  onRetry,
}: {
  group: AgentActivityGroupContentUnit;
  onRetry?: () => void;
}) {
  const registry = useContext(ToolActivityPresenterContext);
  const version = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot);
  const header = useMemo(
    () => deriveAgentActivityHeaderPresentation(group, registry),
    [group, registry, version],
  );
  const visibleBlocks = useMemo(
    () => group.blocks.filter((block) => isVisibleAgentActivityRow(block, registry)),
    [group.blocks, registry, version],
  );
  return (
    <div className="thread-agent-activity__group" data-activity-group-id={group.id}>
      <AgentActivityGroupDisclosure
        canExpand={visibleBlocks.length > 0}
        icon={header.icon === null ? undefined : activityIcon(header.icon)}
        shouldAnimateInitialCollapse={group.lifecycle.isLatestVisibleUnit && group.lifecycle.inProgress && !group.lifecycle.isActivitySliceClosed}
        summary={<CadencedShimmer active={header.active}><AgentActivitySummaryView summary={header.summary} /></CadencedShimmer>}
        summaryKey={header.summaryKey}
        summaryTransition={header.state === "summary" ? "immediate" : "deferred"}
      >
        {() => visibleBlocks.length > 0 ? (
          <div className="thread-agent-activity__rows" data-scroll-owner="timeline">
            {visibleBlocks.map((block) => <GenericBlock block={block} key={block.id} onRetry={onRetry} />)}
          </div>
        ) : null}
      </AgentActivityGroupDisclosure>
    </div>
  );
}

function AgentActivityContent({
  contentUnits,
  onRetry,
}: {
  contentUnits: readonly AgentActivityContentUnit[];
  onRetry?: () => void;
}) {
  return (
    <div className="thread-agent-activity__content" data-unit-count={contentUnits.length}>
      {contentUnits.map((contentUnit) => (
        <div
          className="thread-agent-activity__unit"
          key={contentUnit.id}
        >
          {contentUnit.type === "group"
            ? <AgentActivityGroup group={contentUnit} onRetry={onRetry} />
            : <GenericBlock block={contentUnit.block} onRetry={onRetry} />}
        </div>
      ))}
    </div>
  );
}

function AgentActivity({
  collapsed,
  onCollapsedChange,
  onRetry,
  unit,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onRetry?: () => void;
  unit: AgentActivityRenderUnit;
}) {
  const prefersReducedMotion = useReducedMotion();
  const layout = resolveAgentActivityLayout(unit, collapsed);
  const open = !layout.isCollapsed;
  const inlineSubagentActivity = unit.inlineSubagentActivity;
  const duration = formatWorkedDuration(unit.workedDurationMs);
  const label = duration === null
    ? `${layout.collapsedItemCount} previous message${layout.collapsedItemCount === 1 ? "" : "s"}`
    : `Worked for ${duration}`;
  return (
    <section
      className="thread-agent-activity"
      data-activity-id={unit.id}
      data-activity-phase={unit.phase}
      data-collapsed={layout.isCollapsed || undefined}
      data-force-expanded={unit.forceExpanded || undefined}
    >
      {layout.preToggleUnits.length > 0 ? (
        <div className="thread-agent-activity__pre-toggle">
          <AgentActivityContent contentUnits={layout.preToggleUnits} onRetry={onRetry} />
          {layout.showToggle ? <div aria-hidden="true" className="thread-agent-activity__section-divider" /> : null}
        </div>
      ) : null}
      {layout.showToggle ? (
        <div className="thread-agent-activity__turn-header">
          <button aria-expanded={open} onClick={() => onCollapsedChange(open)} type="button">
            <strong>{label}</strong>
            <ChevronRight className={open ? "is-open" : undefined} size={13} />
          </button>
          <span aria-hidden="true" />
        </div>
      ) : null}
      {layout.persistentUnits.length > 0 ? (
        <div className="thread-agent-activity__persistent-content">
          {layout.showToggle ? <div aria-hidden="true" className="thread-agent-activity__section-divider" /> : null}
          <AgentActivityContent contentUnits={layout.persistentUnits} onRetry={onRetry} />
        </div>
      ) : null}
      <AnimatePresence initial={false}>
        {open && (layout.visibleUnits.length > 0 || inlineSubagentActivity !== null) ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="thread-agent-activity__outer-content"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
            key="content"
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: [0.33, 1, 0.68, 1] }}
          >
            {layout.showToggle ? <div aria-hidden="true" className="thread-agent-activity__section-divider" /> : null}
            {layout.visibleUnits.length > 0
              ? <AgentActivityContent contentUnits={layout.visibleUnits} onRetry={onRetry} />
              : null}
            {inlineSubagentActivity === null ? null : (
              <>
                {layout.visibleUnits.length > 0 ? <div aria-hidden="true" className="thread-agent-activity__section-divider" /> : null}
                <SubagentActivityGroup unit={inlineSubagentActivity} />
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function HookLifecycleIcon(): ReactNode {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <circle cx="8.99805" cy="4.875" r="1.875" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 6.75V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V9.75L13.5 11.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M9 6.75V12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12V9.75L4.5 11.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function hookStatsEntryLabel(kind: HookStats["entries"][number]["kind"]): string {
  switch (kind) {
    case "feedback": return "Feedback";
    case "stop": return "Stop";
    case "error": return "Error";
  }
}

/** Codex keeps hook lifecycle details in a rich hover/focus tooltip. */
export type ConversationDetailLevel = "STEPS_PROSE" | "STEPS_COMMANDS" | "STEPS_EXECUTION";

function HookStatsSummary({ stats }: { readonly stats: HookStats }) {
  return (
    <>
      <strong>Hooks summary</strong>
      <span className="thread-hook-stats__counts">
        <span>Ran</span><b>{stats.count}</b>
        {stats.blockedCount > 0 ? <><span>Blocked</span><b>{stats.blockedCount}</b></> : null}
        {stats.errorCount > 0 ? <><span>Errors</span><b>{stats.errorCount}</b></> : null}
      </span>
      {stats.entries.length > 0 ? (
        <span className="thread-hook-stats__entries">
          {stats.entries.map((entry, index) => (
            <span className="thread-hook-stats__entry" key={`${entry.kind}:${index}:${entry.text}`}>
              <em>{hookStatsEntryLabel(entry.kind)}</em>
              <span>{entry.text}</span>
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
}

function HookStatsDetails({ stats }: { readonly stats: HookStats }) {
  return (
    <>
      <strong>Hooks</strong>
      <ul className="thread-hook-stats__runs">
        {stats.runs.map((run) => (
          <Fragment key={run.id}>
            <li>{formatHookEventName(run.eventName)}</li>
            <li className="thread-hook-stats__run">
              <span>{formatHookSource(run.source)}{run.count > 1 ? ` · ${String(run.count)} runs` : ""}</span>
              {run.statusMessage === null ? null : <span>{run.statusMessage}</span>}
              {run.entries.map((entry, index) => (
                <span className={`is-${entry.tone}`} key={`${entry.tone}:${index}:${entry.text}`}>{entry.text}</span>
              ))}
            </li>
          </Fragment>
        ))}
      </ul>
    </>
  );
}

function HookStatsButton({
  detailLevel,
  stats,
}: {
  readonly detailLevel: ConversationDetailLevel;
  readonly stats: HookStats;
}) {
  const tooltipId = useId();
  const detailed = detailLevel !== "STEPS_PROSE";
  return (
    <span className="thread-hook-stats">
      <span aria-describedby={tooltipId} aria-label="Hooks" className="thread-hook-stats__trigger" role="img" tabIndex={0}>
        <HookLifecycleIcon />
      </span>
      <span className="thread-hook-stats__tooltip" data-detail-level={detailed ? "commands" : "prose"} id={tooltipId} role="tooltip">
        {detailed ? <HookStatsDetails stats={stats} /> : <HookStatsSummary stats={stats} />}
      </span>
    </span>
  );
}


export {
  AgentActivity,
  GenericBlock,
  HookStatsButton,
};
