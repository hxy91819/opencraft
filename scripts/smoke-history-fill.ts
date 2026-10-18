import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const output = resolve(process.env.OPENCRAFT_HISTORY_REPORT ?? ".local/history-fill");
await mkdir(output, { recursive: true });
const server = await createServer({ configFile: false, root: process.cwd(), logLevel: "error",
  esbuild: { jsx: "automatic" }, resolve: { dedupe: ["react", "react-dom"] },
  cacheDir: "node_modules/.vite-history-fill", server: { host: "127.0.0.1", port: 0 },
  plugins: [{ name: "history-fill-fixture", configureServer(vite) {
    vite.middlewares.use((request, response, next) => {
      if (request.url?.split("?")[0] !== "/") return next();
      response.setHeader("content-type", "text/html");
      response.end('<div id="root"></div><script type="module" src="/tests/fixtures/conversation-scroll.tsx"></script>');
    });
  } }],
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const cases = [];
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.OPENCRAFT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const address = server.httpServer!.address() as { port: number };
  for (const policy of ["natural", "response-placement"]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript("window.__name=value=>value");
    await page.goto(`http://127.0.0.1:${address.port}/?history${policy === "natural" ? "&natural" : ""}`);
    await page.waitForFunction(() => (window as any).api && document.querySelector('[data-probe="text-5"]'));
    const settle = () => page.evaluate(async () => { for (let count = 0; count < 20; count++) await new Promise(requestAnimationFrame); });
    await settle();
    assert.equal(await page.evaluate(() => (window as any).historyLoads), 0);
    await page.evaluate(() => (window as any).shrinkHistory());
    await page.waitForFunction(() => (window as any).historyLoads === 1);
    await settle();
    const height = await page.locator(".thread-scroll").evaluate(element => element.scrollHeight);
    assert.ok(height > 1000, "loaded history is actually laid out");
    await page.evaluate(() => (window as any).renderAgain());
    await settle();
    assert.equal(await page.evaluate(() => (window as any).historyLoads), 1, "rendering does not trigger another page");
    await page.screenshot({ path: join(output, `${policy}.png`) });
    assert.deepEqual(errors, []);
    cases.push({ policy, filledViewportLoads: 0, afterShrinkLoads: 1, afterRenderLoads: 1, height });
    await page.close();
  }
  await writeFile(join(output, "report.json"), JSON.stringify({ cases }, null, 2) + "\n");
  console.log(JSON.stringify({ passed: cases.length, cases }));
} finally {
  await browser?.close();
  await server.close();
}
