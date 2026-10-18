import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";

const output = resolve(process.env.OPENCRAFT_BROWSER_CLOSURE_REPORT ?? ".local/browser-presentation-closure");
await mkdir(output, { recursive: true });
const vite = await createServer({ configFile: false, root: process.cwd(), logLevel: "error",
  esbuild: { jsx: "automatic" }, resolve: { dedupe: ["react", "react-dom"] },
  cacheDir: "node_modules/.vite-browser-presentation-closure", server: { host: "127.0.0.1", port: 0 },
  plugins: [{ name: "browser-closure-fixture", configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (!request.url?.startsWith("/?") && request.url !== "/") return next();
      response.setHeader("content-type", "text/html");
      response.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="surfaces" style="position:fixed;inset:0;z-index:1;pointer-events:none"></div><div id="root"></div><script type="module" src="/tests/fixtures/browser-presentation-closure.tsx"></script>');
    });
  } }],
});
let inspectedPage: import("playwright").Page | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await vite.listen();
  browser = await chromium.launch({ executablePath: process.env.OPENCRAFT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const results = [];
  for (const width of [390, 1100]) for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width === 390, isMobile: width === 390 });
    inspectedPage = page;
    await page.addInitScript("window.__name=value=>value");
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${(vite.httpServer!.address() as { port: number }).port}/?theme=${theme}`);
    const visible = page.locator('iframe[data-browser-surface-visible="true"]');
    await expect(visible).toHaveCount(1);
    const firstId = await visible.getAttribute("data-browser-page-id");
    await visible.evaluate((iframe: HTMLIFrameElement) => { iframe.dataset.fixtureIdentity = "kept"; });
    await page.getByRole("button", { name: "Hide page", exact: true }).click();
    await expect(visible).toHaveCount(0);
    await page.getByRole("button", { name: "Show page", exact: true }).click();
    await expect(visible).toHaveCount(1);
    assert.equal(await visible.getAttribute("data-browser-page-id"), firstId);
    assert.equal(await visible.getAttribute("data-fixture-identity"), "kept");
    const secondId = await page.evaluate(first => (window as any).browserClosure.ids.find((id: string) => id !== first), firstId);
    await page.getByRole("button", { name: "Switch page", exact: true }).click();
    await expect.poll(() => visible.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-browser-page-id")))).toEqual([secondId]);
    await page.getByRole("button", { name: "Switch page", exact: true }).click();
    await expect.poll(() => visible.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-browser-page-id")))).toEqual([firstId]);
    const widthInput = page.getByRole("spinbutton", { name: "Viewport width", exact: true });
    await widthInput.fill("500"); await widthInput.press("Tab");
    await expect(widthInput).toHaveValue("500");
    await expect(visible).toHaveCSS("width", "500px");
    await page.getByRole("button", { name: "Rotate viewport", exact: true }).click();
    await expect(widthInput).toHaveValue("852");
    await page.getByRole("combobox", { name: "Device preset", exact: true }).selectOption("iphone-se");
    await expect(widthInput).toHaveValue("375");
    await expect(visible).toHaveCSS("width", "375px");
    const bounds = await page.getByRole("button", { name: "Resize viewport bottom-right", exact: true }).boundingBox();
    assert.ok(bounds);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 - 24, bounds.y + bounds.height / 2 - 12);
    assert.notEqual(await widthInput.inputValue(), "375", "resize publishes while held");
    await page.mouse.up();
    await page.getByRole("button", { name: "Resize viewport bottom-right", exact: true }).focus();
    const before = Number(await widthInput.inputValue());
    await page.keyboard.press("ArrowRight");
    assert.equal(Number(await widthInput.inputValue()), before + 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(output, `${width}-${theme}.png`) });
    await page.evaluate(() => (window as any).browserClosure.dispose());
    await expect(page.locator("iframe")).toHaveCount(0);
    assert.deepEqual(errors, []);
    results.push({ width, theme, preservedBacking: true, switch: true, deviceControls: true, heldResize: true, keyboardResize: true, disposed: true });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
  await writeFile(join(output, "report.json"), JSON.stringify({ results }, null, 2));
} catch (error) {
  if (inspectedPage && !inspectedPage.isClosed()) {
    await inspectedPage.screenshot({ path: join(output, "failure.png") });
    await writeFile(join(output, "failure.html"), await inspectedPage.content());
    console.error(await inspectedPage.evaluate(() => {
      const runtime = (window as any).browserClosure;
      return { hosts: [...runtime.coordinator.manager.webviews].map(([key, host]: any) => ({ key, painted: host.isPainted(), generation: host.getMountGeneration() })),
        slots: [...(runtime.coordinator.manager.pagePresentationTransition as any).slots].map(([key, slot]: any) => ({ key, painted: slot.painted?.host.getBrowserTabId(), incoming: slot.replacement?.incoming.host.getBrowserTabId(), phase: slot.replacement?.phase })) };
    }));
  }
  throw error;
} finally { await browser?.close(); await vite.close(); }
