import React, { useState } from "react";
import { Context } from "@deepseek-ai/cordis";
import { createConversationKey, createDefaultTimelineProjectorRegistry, projectTimeline, type TimelineSourceItem } from "@opencraft/chat-core";
import { buildCodexThemeCssProperties } from "@opencraft/design-system/theme-engine";
import { TimelineBlockRendererProvider, TimelineBlockRendererRegistryService } from "@opencraft/timeline-render-react";
import { Conversation } from "../../apps/workbench-web/src/components/conversation";
import { BuiltinTimelineRendererPlugin } from "../../apps/workbench-web/src/components/conversation-renderers/builtin-timeline-renderer-plugin";
import { createIntlTestRoot } from "./intl-root";
import "../../apps/workbench-web/src/styles/app.scss";

const context = new Context();
await context.plugin(TimelineBlockRendererRegistryService);
await context.plugin(BuiltinTimelineRendererPlugin);
const theme = new URLSearchParams(location.search).get("theme") === "dark" ? "dark" : "light";
document.documentElement.dataset.theme = theme;
for (const [key, value] of Object.entries(buildCodexThemeCssProperties(theme))) document.documentElement.style.setProperty(key, value);
const registry = createDefaultTimelineProjectorRegistry();
const probe = window as unknown as { changeThreadToolPhase: (phase: string) => void; openedThreads: string[] };
probe.openedThreads = [];
function tool(id: string, name: string, arguments_: unknown, status = "completed", output?: unknown): TimelineSourceItem {
  return { id, type: "dynamicToolCall", payload: {
    namespace: "codex_app", tool: name, arguments: arguments_, status, success: status !== "failed",
    ...(output === undefined ? {} : { contentItems: [{ type: "inputText", text: JSON.stringify(output) }] }),
  } };
}

function Demo() {
  const [phase, setPhase] = useState("inProgress");
  probe.changeThreadToolPhase = setPhase;
  const items: TimelineSourceItem[] = [
    { id: "user-link", type: "userMessage", payload: { content: [{ type: "text", text: "Inspect [design notes](https://example.test/design-notes) before changing the theme." }] } },
    tool("fork", "fork_thread", { environment: { type: "worktree" } }, phase),
    tool("read", "read_thread", { threadId: "read-target" }),
    tool("create", "create_thread", { target: { type: "project" } }, "completed", { threadId: "created-target", hostId: "local" }),
    tool("transfer", "handoff_thread", { threadId: "other", destinationHostId: "remote" }, "completed", {
      operationId: "transfer", status: "warning", threadTitle: "Review", destinationHostDisplayName: "Remote",
      destinationThreadId: "remote-target", steps: [{ id: "prepare-host-transfer", status: "done" }, { id: "transfer-host-artifacts", status: "failed" }, { id: "create-new-worktree", status: "pending" }],
    }),
    tool("poll", "get_handoff_status", { operationId: "missing" }, "failed"),
    tool("queued", "handoff_thread", { threadId: "queued-target" }, "completed", {
      operationId: "queued", status: "queued", steps: [{ id: "custom-prepare-step", status: "pending" }],
    }),
    { id: "browser", type: "mcpToolCall", payload: { server: "browser", tool: "browser_click", status: phase,
      arguments: {}, result: { content: [], _meta: { "codex/toolSurface": { kind: "browserUse", backend: "chrome" } } } } },
    { id: "computer", type: "mcpToolCall", payload: { server: "computer-use", tool: "scroll", status: phase,
      arguments: { direction: "down", app: "Notes" } } },
    { id: "custom", type: "dynamicToolCall", payload: { namespace: "custom", tool: "inspect_workspace", status: phase, success: phase !== "failed" } },
    { id: "command-context", type: "commandExecution", payload: { command: "date -u", status: phase,
      durationMs: 2_000, exitCode: phase === "failed" ? 1 : phase === "completed" ? 0 : null,
      automaticApprovalReviews: [{ reviewId: "review-date", targetItemId: "command-context",
        startedAtMs: 1, completedAtMs: 2, status: "timedOut", riskLevel: "low", userAuthorization: "high",
        rationale: "Read the current UTC date.", action: { type: "command", source: "shell", command: "date -u", cwd: "/workspace" }, decisionSource: "agent" }] } },
    { id: "search-context", type: "webSearch", payload: { status: "completed",
      query: "release site:example.com OR site:docs.example.com", action: { type: "search",
      queries: ["release site:example.com OR site:docs.example.com", "migration notes"] } } },
  ];
  const timeline = projectTimeline({ key: createConversationKey("fixture", "thread-tools"), revision: ["inProgress", "completed", "failed", "interrupted"].indexOf(phase),
    authoritative: true, phase: "live", turns: [{ id: "turn", status: phase === "inProgress" ? "streaming" : "complete", items }] }, registry);
  return <div data-phase={phase} style={{ width: "100vw", height: "100dvh" }}>
    <TimelineBlockRendererProvider registry={context.timelineBlockRenderers}>
      <Conversation timeline={timeline} scrollPolicy="natural" threadDetailLevel="STEPS_PROSE"
        onOpenSubagent={id => probe.openedThreads.push(id)}
        footer={<div style={{ height: 48 }}>Composer fixture</div>} />
    </TimelineBlockRendererProvider>
  </div>;
}
createIntlTestRoot(document.getElementById("root")!).render(<Demo />);
