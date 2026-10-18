import { useWorkbenchPresentationActive } from "../../workbench-presentation-activity";
import { useIntl } from "@opencraft/i18n/react";
import { ThinkingLabel } from "../../thinking-label";
import {
  formatAutomaticApprovalReviewSummary,
  formatAutomaticApprovalReviewTitle,
  formatCodexToolDuration,
  formatCommandActivitySummary,
  isAutomaticApprovalReviewWarning,
  summarizeAutomaticApprovalReviewAction,
  skillReadPresentation,
  presentReasoning,
  type ReasoningContentPresentation,
  type AutomaticApprovalReview,
  type TimelineBlock,
} from "@opencraft/chat-core";
import {
  AnsiTerminalText,
  WebChatDocument,
  normalizeTerminalOutput,
  resolveStandardChatResource,
  writeTextToClipboard,
  writeToClipboard,
} from "@opencraft/chat-render-web";
import {
  AlertCircle,
  Brain,
  Check,
  ChevronRight,
  ShieldCheck,
  Copy,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { ConversationDocumentContext } from "../../conversation/document-context";
import { activityIcon } from "./activity-icon";
import {
  ActivityDisclosure,
  CadencedShimmer,
  useCodexActivityOpen,
} from "./activity-disclosure";
import { useToolActivityPresentation, ConversationDetailContext } from "../render-contexts";

function ReasoningBlock({ block, presentation, active = block.streaming, collapsed, onCollapsedChange }: {
  readonly block: Extract<TimelineBlock, { type: "reasoning" }>;
  readonly presentation?: ReasoningContentPresentation;
  readonly active?: boolean;
  readonly collapsed?: boolean;
  readonly onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const intl = useIntl();
  const document = useContext(ConversationDocumentContext);
  // One View choice across running/settled phases, unlike tool activity's
  // independent live/history defaults. Only explicit activation writes it.
  const [localOpen, setLocalOpen] = useState(false);
  const content = presentation ?? presentReasoning(block, active);
  const open = collapsed === undefined ? localOpen : !collapsed;
  const setOpen = (next: boolean) => {
    if (onCollapsedChange) onCollapsedChange(!next);
    else setLocalOpen(next);
  };
  if (content === null) return null;
  return (
    <div className="thread-reasoning" data-conversation-row="activity" data-reasoning-id={block.id} data-reasoning-active={active}>
      <ActivityDisclosure
        icon={<Brain aria-hidden="true" focusable="false" />}
        onOpenChange={setOpen}
        open={open}
        running={active}
        summary={active ? <ThinkingLabel /> : intl.formatMessage({ id: "chat.thought", defaultMessage: "Thought" })}
        detail={content.header}
        unmountBodyWhenCollapsed
      >
        <div className="thread-activity-item__prose">
          <WebChatDocument
            documentId={block.id}
            source={content.content}
            streaming={active}
            conversationId={document.conversationId}
            hostId={document.hostId}
            cwd={document.cwd}
            theme={document.theme}
            allowWideBlocks={false}
            onOpenResource={document.onOpenResource}
            loadMediaSource={document.loadMediaSource}
            onMeasurementRequest={document.onMeasurementRequest}
          />
        </div>
      </ActivityDisclosure>
    </div>
  );
}

function useCommandElapsedLabel(
  block: Extract<TimelineBlock, { type: "command-execution" }>,
  running: boolean,
): string | null {
  const presentationActive = useWorkbenchPresentationActive();
  const fallbackStartedAt = useRef<number | null>(null);
  if (fallbackStartedAt.current === null && running) fallbackStartedAt.current = Date.now();
  const [nowMs, setNowMs] = useState(Date.now);
  const backgroundRunning = running && !block.turnInProgress;
  useEffect(() => {
    if (!presentationActive || !running || backgroundRunning) return;
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [backgroundRunning, presentationActive, running]);
  const durationMs = running
    ? Math.max(0, nowMs - (block.startedAtMs ?? fallbackStartedAt.current ?? nowMs))
    : Math.max(0, block.durationMs ?? 0);
  return formatCodexToolDuration(durationMs);
}

/** The existing licensed icon set owns review artwork. */
function AutomaticApprovalReviewIcon() {
  return <ShieldCheck aria-hidden="true" size={24} />;
}

function automaticApprovalReviewActivityStatus(
  review: AutomaticApprovalReview,
): "running" | "completed" | "failed" | "interrupted" {
  if (review.status === "inProgress") return "running";
  if (review.status === "denied") return "failed";
  if (review.status === "aborted") return "interrupted";
  return "completed";
}

function AutomaticApprovalReviewRow({ review }: { readonly review: AutomaticApprovalReview }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const warning = isAutomaticApprovalReviewWarning(review);
  const title = formatAutomaticApprovalReviewTitle(review);
  const summary = formatAutomaticApprovalReviewSummary(review);
  return (
    <div className="thread-auto-review" data-status={review.status} data-warning={warning || undefined}>
      <button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button">
        <CadencedShimmer active={review.status === "inProgress"}>{title}</CadencedShimmer>
        <ChevronRight aria-hidden="true" size={12} />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.p
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.19, 1, 0.22, 1] }}
          >{summary}</motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AutomaticApprovalReviewList({ reviews }: { readonly reviews: readonly AutomaticApprovalReview[] }) {
  if (reviews.length === 0) return null;
  return <div className="thread-auto-review-list">{reviews.map((review) => <AutomaticApprovalReviewRow key={review.id} review={review} />)}</div>;
}

function AutomaticApprovalReviewBlock({ block }: { readonly block: Extract<TimelineBlock, { type: "automatic-approval-review" }> }) {
  const review = block.review;
  const running = review.status === "inProgress";
  const [open, setOpen] = useCodexActivityOpen(running);
  return (
    <ActivityDisclosure
      icon={<Wrench />}
      onOpenChange={setOpen}
      open={open}
      running={running}
      status={automaticApprovalReviewActivityStatus(review)}
      summary={summarizeAutomaticApprovalReviewAction(review.action)}
    >
      <AutomaticApprovalReviewRow review={review} />
    </ActivityDisclosure>
  );
}

function AutoReviewInterruptionWarningBlock({ block }: { readonly block: Extract<TimelineBlock, { type: "auto-review-interruption-warning" }> }) {
  return (
    <div className="thread-event-divider thread-auto-review-interruption">
      <span><Wrench aria-hidden="true" size={13} />{block.message}<i aria-label={block.detail} title={block.detail}><AlertCircle aria-hidden="true" size={12} /></i></span>
    </div>
  );
}

function unwrapShellCommand(value: string): string {
  const stripOuterQuotes = (source: string): string => {
    let result = source.trim().replace(/^\$\s+/u, "");
    let changed = true;
    while (changed) {
      changed = false;
      if ((result.startsWith("'") && result.endsWith("'")) || (result.startsWith('"') && result.endsWith('"'))) {
        result = result.slice(1, -1).trim();
        changed = true;
      }
    }
    return result.replace(/'"'"'/gu, "'").trim();
  };
  const normalized = stripOuterQuotes(value);
  const wrapper = normalized.match(/^(?:\/bin\/zsh|\/bin\/bash|zsh|bash)\s+-lc\s+([\s\S]+)$/u);
  return stripOuterQuotes(wrapper?.[1] ?? normalized);
}

function ShellCopyButton({ className = "", label, value }: { readonly className?: string; readonly label: string; readonly value: string }) {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);
  const copy = useCallback(() => {
    void writeTextToClipboard(value).then(() => {
      setCopied(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => setCopied(false));
  }, [value]);
  return (
    <button aria-label={copied ? intl.formatMessage({ id: "common.copied", defaultMessage: "Copied" }) : label} className={`thread-shell-output__copy ${className}`} onClick={copy} title={copied ? intl.formatMessage({ id: "common.copied", defaultMessage: "Copied" }) : label} type="button">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function AssistantCopyButton({ value, getHtml, label }: { readonly value: string; readonly getHtml?: () => string | null; readonly label?: string }) {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);
  const copy = useCallback(() => {
    const html = getHtml?.();
    void writeToClipboard(html ? { "text/plain": value, "text/html": html } : value).then(() => {
      setCopied(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1_500);
    }).catch(() => setCopied(false));
  }, [value, getHtml]);
  return (
    <button aria-label={copied ? intl.formatMessage({ id: "common.copied", defaultMessage: "Copied" }) : label ?? intl.formatMessage({ id: "chat.response.copy", defaultMessage: "Copy response" })} onClick={copy} title={copied ? intl.formatMessage({ id: "common.copied", defaultMessage: "Copied" }) : label ?? intl.formatMessage({ id: "chat.response.copy", defaultMessage: "Copy response" })} type="button">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function EmbeddedShellOutput({ block }: { block: Extract<TimelineBlock, { type: "command-execution" }> }) {
  const intl = useIntl();
  const running = block.status === "pending" || block.status === "running";
  const command = unwrapShellCommand(block.command);
  const output = normalizeTerminalOutput(block.output ?? "");
  const displayOutput = /\S/u.test(output) ? output : running ? "" : block.resultMissing ? "Execution result unavailable" : "No output";
  const outputRef = useRef<HTMLPreElement>(null);
  const followsOutputRef = useRef(true);
  const updateFollowIntent = useCallback(() => {
    const element = outputRef.current;
    if (element === null) return;
    followsOutputRef.current = element.scrollHeight - element.clientHeight - element.scrollTop <= 2;
  }, []);
  useLayoutEffect(() => {
    const element = outputRef.current;
    if (element !== null && followsOutputRef.current) element.scrollTop = element.scrollHeight;
  }, [displayOutput]);
  const footer = running ? null
    : block.resultMissing ? <span>Result unknown</span>
    : block.status === "interrupted" ? <span>Stopped</span>
    : block.exitCode === 0 ? <span><Check size={11} /> Success</span>
    : <span>Exit code {block.exitCode ?? "unknown"}</span>;
  return (
    <div className="thread-shell-output" title={block.cwd === null ? undefined : `cwd\n${block.cwd}`}>
      {command.trim().length > 0 ? (
        <div className="thread-shell-output__command">
          <code><span aria-hidden="true">$ </span><AnsiTerminalText>{command}</AnsiTerminalText></code>
          <ShellCopyButton label={intl.formatMessage({ id: "chat.command.copy", defaultMessage: "Copy command" })} value={command} />
        </div>
      ) : null}
      <div className="thread-shell-output__output">
        <pre onScroll={updateFollowIntent} ref={outputRef}><code><AnsiTerminalText>{displayOutput}</AnsiTerminalText></code></pre>
        {output.length > 0 ? <ShellCopyButton label={intl.formatMessage({ id: "chat.output.copy", defaultMessage: "Copy output" })} value={output} /> : null}
      </div>
      <div className="thread-shell-output__footer" data-status={block.status}>{footer}</div>
    </div>
  );
}

function CommandBlock({ block }: { block: Extract<TimelineBlock, { type: "command-execution" }> }) {
  const presentation = useToolActivityPresentation(block);
  const detailLevel = useContext(ConversationDetailContext);
  const skill = skillReadPresentation(block, detailLevel);
  const documentContext = useContext(ConversationDocumentContext);
  // ExecShellContainer owns one persistent disclosure state. Unlike generic
  // Activity rows, a running command starts collapsed and does not switch to
  // separate live/settled memories when it completes.
  const [open, setOpen] = useState(false);
  const elapsedLabel = useCommandElapsedLabel(block, presentation.state === "running");
  const action = block.actions.length === 1 ? block.actions[0] : undefined;
  const semanticAction = action !== undefined && action.type !== "unknown";
  const summary = skill?.summary ?? (semanticAction
    ? presentation.summary
    : formatCommandActivitySummary(block, presentation.state, { expanded: open, elapsedLabel }));
  const detail = skill?.detail ?? (action?.type === "read" && action.path.trim().length > 0 ? (
    <button
      className="thread-activity-item__file-link"
      onClick={(event) => {
        event.stopPropagation();
        const decision = resolveStandardChatResource(action.path, {
          cwd: documentContext.cwd,
          externalResourcePolicy: "allow",
        });
        if (decision.allowed && decision.target !== null) {
          documentContext.onOpenResource?.(decision.target, decision);
        }
      }}
      type="button"
    >{presentation.detail ?? action.path}</button>
  ) : semanticAction ? presentation.detail : null);
  const hasAuxiliaryBody = block.automaticApprovalReviews.length > 0;
  if (skill?.visible === false) return null;
  return (
    <ActivityDisclosure
      accessory={block.automaticApprovalReviews.length > 0 ? <AutomaticApprovalReviewIcon /> : null}
      detail={detail}
      icon={activityIcon(presentation.icon)}
      onOpenChange={setOpen}
      open={open}
      running={presentation.state === "running"}
      status={presentation.state}
      summary={summary}
      unmountBodyWhenCollapsed
    >
      {(!semanticAction && presentation.canExpand) || hasAuxiliaryBody ? (
        <>
          {!semanticAction && presentation.canExpand ? <EmbeddedShellOutput block={block} /> : null}
          <AutomaticApprovalReviewList reviews={block.automaticApprovalReviews} />
        </>
      ) : null}
    </ActivityDisclosure>
  );
}


export {
  AssistantCopyButton,
  AutomaticApprovalReviewBlock,
  AutomaticApprovalReviewIcon,
  AutomaticApprovalReviewList,
  AutoReviewInterruptionWarningBlock,
  CommandBlock,
  ReasoningBlock,
};
