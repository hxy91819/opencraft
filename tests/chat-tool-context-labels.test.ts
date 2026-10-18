import assert from "node:assert/strict";
import test from "node:test";
import { extractWebSearchDetail, formatCommandActivitySummary } from "@opencraft/chat-core";
import type { CommandExecutionTimelineBlock } from "@opencraft/chat-core";

test("web search labels preserve literal search operators and every requested query", () => {
  assert.equal(extractWebSearchDetail({ action: { type: "search",
    queries: ["release site:example.com OR site:docs.example.com", "migration notes"] } }),
    "release site:example.com OR site:docs.example.com · migration notes");
});

test("page search context keeps pattern and destination without a recovered sentence template", () => {
  assert.equal(extractWebSearchDetail({ action: { type: "findInPage", pattern: "notes", url: "https://example.com" } }),
    "notes · https://example.com");
  assert.equal(extractWebSearchDetail({ action: { type: "open_page", url: "https://example.com" } }), "https://example.com");
  assert.equal(extractWebSearchDetail({ action: { type: "search", queries: ["", null] }, query: "fallback" }), "fallback");
  assert.equal(extractWebSearchDetail({ action: { type: "other" } }), null);
});

function command(values: Partial<CommandExecutionTimelineBlock> = {}): CommandExecutionTimelineBlock {
  return { id: "command", sourceItemIds: ["command"], type: "command-execution", status: "complete",
    command: "date -u", cwd: "/workspace", callId: null, startedAtMs: null, automaticApprovalReviews: [],
    output: "", exitCode: 1, durationMs: 2_000, actions: [], processId: null, turnInProgress: true, ...values };
}

test("command captions always represent failure, including a date command", () => {
  assert.equal(formatCommandActivitySummary(command(), "failed", { expanded: false, elapsedLabel: "2s" }),
    "Command · Failed · 2s · date -u");
  assert.equal(formatCommandActivitySummary(command(), "failed", { expanded: true, elapsedLabel: "2s" }),
    "Command · Failed · 2s");
});

test("background command captions retain execution state and elapsed time", () => {
  const block = command({ command: "npm run dev", turnInProgress: false, processId: "process" });
  assert.equal(formatCommandActivitySummary(block, "running", { expanded: false, elapsedLabel: "3s" }),
    "Background terminal · Running · 3s · npm run dev");
  assert.equal(formatCommandActivitySummary(block, "interrupted", { expanded: true, elapsedLabel: null }),
    "Background terminal · Stopped");
});
