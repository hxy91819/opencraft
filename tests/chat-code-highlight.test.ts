import assert from "node:assert/strict";
import test from "node:test";

import { highlightChatCodeHtml, highlightChatCodeTokens } from "@opencraft/chat-render-react/code-highlight";

for (const theme of ["light", "dark"] as const) {
  test(`shared syntax highlighting preserves code text, colors and aliases in ${theme} mode`, async () => {
    const code = "// greeting\nconst answer = 42;\nconsole.log(\"hello\", answer);\n";
    const signal = new AbortController().signal;
    const [lines, html] = await Promise.all([
      highlightChatCodeTokens(code, "ts", theme, signal),
      highlightChatCodeHtml(code, "typescript", theme, signal),
    ]);
    assert.equal(lines.map(line => line.map(token => token.content).join("")).join("\n"), code);
    const colors = new Set(lines.flat().filter(token => token.content.trim()).map(token => token.color));
    assert.ok(colors.size >= 3, "comments, code and strings remain distinguishable");
    assert.ok(html.includes(`class="shiki codex-${theme}"`));
    for (const color of colors) assert.ok(html.toLowerCase().includes(color.toLowerCase()));
  });
}

test("cancelled syntax work cannot commit a stale result", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(highlightChatCodeTokens("let x = 1", "javascript", "light", controller.signal));
});
