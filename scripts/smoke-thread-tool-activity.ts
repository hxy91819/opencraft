import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";

const output = resolve(process.env.OPENCRAFT_THREAD_TOOL_REPORT ?? ".local/thread-tool-activity");
await mkdir(output, { recursive: true });
const vite = await createServer({ configFile: false, root: process.cwd(), logLevel: "error",
  esbuild: { jsx: "automatic" }, resolve: { dedupe: ["react", "react-dom"] },
  cacheDir: "node_modules/.vite-thread-tool-activity", server: { host: "127.0.0.1", port: 0 },
  plugins: [{ name: "thread-tool-fixture", configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url !== "/" && !request.url?.startsWith("/?")) return next();
      response.setHeader("content-type", "text/html");
      response.end('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/tests/fixtures/thread-tool-activity.tsx"></script>');
    });
  } }],
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let inspectedPage: Awaited<ReturnType<NonNullable<typeof browser>["newPage"]>> | undefined;
const results = [];
try {
  await vite.listen();
  browser = await chromium.launch({ executablePath: process.env.OPENCRAFT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  for (const width of [390, 1100]) for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: width === 390, isMobile: width === 390, reducedMotion: "reduce" });
    inspectedPage = page;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript("window.__name=value=>value");
    await page.goto(`http://127.0.0.1:${(vite.httpServer!.address() as { port: number }).port}/?theme=${theme}`);
    const syntax = page.locator(".chat-code-block").filter({ hasText: "const answer" });
    await syntax.locator(".line span[style]").first().waitFor();
    const syntaxColors = await syntax.locator(".line span[style]").evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node).color))]);
    assert.ok(syntaxColors.length >= 3, "actual code surface preserves distinct syntax colors");
    assert.ok((await syntax.innerText()).includes('console.log("hello", answer)'));
    const nativeSummary = page.locator(".thread-codex-app-tool-row .thread-activity-item__summary");
    // Group headers repeat the last activity title; inspect the actual status-bearing rows.
    const surfaceSummary = page.locator(".thread-activity-item[data-status] > .thread-activity-item__header .thread-activity-item__summary");
    await page.locator('[data-phase="inProgress"]').waitFor();
    const collapsed = page.locator('.thread-agent-activity__group button[aria-expanded="false"]');
    for (let index = 0; index < 20 && await collapsed.count() > 0; index++) await collapsed.first().click();
    assert.equal(await collapsed.count(), 0, "all native activity groups opened");
    await page.getByText("design notes", { exact: true }).waitFor();
    assert.equal(await page.locator(".lucide-shield-check").count(), 1, "licensed automatic-review glyph rendered");
    await nativeSummary.filter({ hasText: "Fork thread · Worktree · Running" }).waitFor();
    await page.getByText("Get handoff status · Failed", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Open chat", exact: true }).filter({ hasText: "Read thread" }).click();
    await page.locator(".thread-created-thread-card").click();
    assert.deepEqual(await page.evaluate(() => (window as any).openedThreads), ["read-target", "created-target"]);
    const transferDisclosure = page.getByRole("button", { name: "Transfer · Review · Remote · Needs attention", exact: true });
    if (await transferDisclosure.getAttribute("aria-expanded") !== "true") await transferDisclosure.click();
    assert.equal(await transferDisclosure.getAttribute("aria-expanded"), "true");
    await page.getByText("Prepare host transfer", { exact: true }).waitFor();
    const steps = page.locator(".thread-handoff-step");
    assert.equal(await steps.filter({ hasText: "Create new worktree" }).getAttribute("data-status"), "pending");
    assert.equal(await steps.filter({ hasText: "Transfer host artifacts" }).getAttribute("data-status"), "failed");
    assert.equal(await steps.filter({ hasText: "Rolling back changes" }).count(), 0);
    const queuedDisclosure = page.getByRole("button", { name: "Transfer · Queued", exact: true });
    if (await queuedDisclosure.getAttribute("aria-expanded") !== "true") await queuedDisclosure.click();
    assert.equal(await queuedDisclosure.getAttribute("aria-expanded"), "true");
    assert.equal(await steps.filter({ hasText: "Custom prepare step" }).getAttribute("data-status"), "pending");
    for (const title of ["Browser click · Chrome", "Scroll · Notes · down", "Inspect workspace"]) {
      await surfaceSummary.filter({ hasText: `${title} · Running` }).waitFor();
    }
    await surfaceSummary.filter({ hasText: "Command · Running" }).waitFor();
    await page.getByText("for release site:example.com OR site:docs.example.com · migration notes", { exact: true }).waitFor();
    for (const [phase, label] of [["completed", "Completed"], ["failed", "Failed"], ["interrupted", "Stopped"]]) {
      await page.evaluate(phase => (window as any).changeThreadToolPhase(phase), phase);
      await nativeSummary.filter({ hasText: `Fork thread · Worktree · ${label}` }).waitFor();
      for (const title of ["Browser click · Chrome", "Scroll · Notes · down", "Inspect workspace"]) {
        await surfaceSummary.filter({ hasText: `${title} · ${label}` }).waitFor();
      }
      await surfaceSummary.filter({ hasText: `Command · ${label}` }).waitFor();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(output, `${width}-${theme}.png`) });
    assert.deepEqual(errors, []);
    results.push({ width, theme, navigationAndCreatedCard: true, transferSteps: true, failedPollVisible: true, reportedStepStates: true, allSurfacePhases: true, allPhases: true, literalQueries: true, commandPhases: true, composerLink: true, licensedReviewGlyph: true, syntaxHighlighting: true });
    console.log(JSON.stringify({ width, theme, passed: true }));
    await page.close();
  }
  await writeFile(join(output, "report.json"), JSON.stringify({ results }, null, 2));
  console.log(JSON.stringify({ passed: results.length, output }));
} catch (error) {
  if (inspectedPage && !inspectedPage.isClosed()) {
    await writeFile(join(output, "failure.html"), await inspectedPage.content());
    await inspectedPage.screenshot({ path: join(output, "failure.png") });
  }
  throw error;
} finally { await browser?.close(); await vite.close(); }
