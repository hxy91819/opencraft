import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
const { chromium } = await import(process.env.OPENCRAFT_PLAYWRIGHT_MODULE ?? "playwright");
const output = process.env.OPENCRAFT_SMOKE_OUTPUT ?? ".local/composer-corners";
await mkdir(output, { recursive: true });
const css = process.env.OPENCRAFT_SMOKE_CSS ? await readFile(process.env.OPENCRAFT_SMOKE_CSS, "utf8") : null;
const server = await createServer({ root: process.cwd(), configFile: false, cacheDir: "node_modules/.vite-composer-corners", logLevel: "error", esbuild: { jsx: "automatic" }, resolve: { dedupe: ["react", "react-dom"] }, server: { host: "127.0.0.1", port: 0 }, plugins: [{ name: "composer-corners", resolveId: id => id === "/corner.css" ? id : null, load: id => id === "/corner.css" ? css : null,
 transform(code, id) { return css !== null && id.endsWith("/tests/fixtures/touch-newera.tsx") ? code.replace('import "../../apps/workbench-web/src/styles/app.scss";', 'import "/corner.css";') : null; },
 configureServer(vite) { vite.middlewares.use((req, res, next) => { if (!req.url?.startsWith("/?")) return next(); res.setHeader("content-type", "text/html"); res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/fixtures/touch-newera.tsx"></script>'); }); }
}] });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.OPENCRAFT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
const results: unknown[] = [];
try {
 for (const width of [320, 390, 1280]) for (const mode of ["light", "dark"]) for (const newera of [false, true]) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: width < 768 });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript("window.__name=value=>value");
  await page.goto(`${server.resolvedUrls!.local[0]}?palette=codex&mode=${mode}&pickerFocus&corners`);
  const editor = page.locator(".codex-composer-editor"); await editor.waitFor();
  await page.evaluate(({ width, newera }) => { (window as any).setTouch(width < 768); (window as any).setNewera(newera); }, { width, newera });
  await editor.fill("保留草稿与焦点"); await page.waitForTimeout(180);
  await editor.evaluate(node => { (window as any).keptEditor = node; });
  const initial = await page.locator(".codex-composer-stack").boundingBox();
  // Replace transcript paint with saturated activity across BOTH lower corners.
  // Comparing actual pixels catches the gap missed by gutter declarations.
  await page.locator(".thread-scroll-footer").evaluate(node => {
   const marker = document.createElement("div"); marker.id = "corner-activity-probe";
   marker.setAttribute("aria-hidden", "true"); marker.style.cssText = "position:absolute;inset:0;z-index:0;pointer-events:none;background:#ff00ff";
   node.prepend(marker);
  });
  const shell = page.locator(".codex-composer-shell"); const bounds = (await shell.boundingBox())!;
  for (const side of ["left", "right"] as const) {
   const clip = { x: Math.round(side === "left" ? bounds.x + 1 : bounds.x + bounds.width - 5), y: Math.round(bounds.y + bounds.height - 5), width: 3, height: 3 };
   const before = await page.screenshot({ clip });
   await page.locator("#corner-activity-probe").evaluate(node => { (node as HTMLElement).style.background = "#00ff00"; });
   const after = await page.screenshot({ clip });
   assert(before.equals(after), `${width}/${mode}/${newera}/${side}: activity pixels leak outside lower corner`);
   await page.locator("#corner-activity-probe").evaluate(node => { (node as HTMLElement).style.background = "#ff00ff"; });
  }
  assert.deepEqual(await page.locator(".codex-composer-stack").boundingBox(), initial, "exterior material adds no height");
  await page.locator("#corner-activity-probe").evaluate(node => node.remove());
  await editor.click();
  assert(await editor.evaluate(node => node === (window as any).keptEditor && node.contains(document.activeElement)), "same editor retains focus");
  assert.equal(await editor.innerText(), "保留草稿与焦点");
  await page.locator(".codex-composer-mode--intelligence").click();
  await page.locator(".codex-composer-selection-menu--intelligence[data-state=open]").waitFor(); await page.keyboard.press("Escape");
  await page.evaluate(() => (window as any).setQueue(true)); await page.waitForTimeout(60);
  assert.equal(await shell.evaluate(node => getComputedStyle(node).overflow), "visible", "menus are not clipped");
  if (width === 390 || width === 1280) await page.screenshot({ path: `${output}/${width}-${mode}-${newera}.png` });
  assert.deepEqual(errors, []); results.push({ width, mode, newera, bounds }); console.log(`PASS ${width}/${mode}/${newera}`); await page.close();
 }
 await writeFile(`${output}/geometry.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); await server.close(); }
