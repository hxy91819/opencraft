import assert from "node:assert/strict";
import { createServer } from "vite";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.OPENCRAFT_PLAYWRIGHT_MODULE ?? "playwright");
const source = `
import React from 'react';
import {createIntlTestRoot} from '/tests/fixtures/intl-root.tsx';
import {createWebWorkbenchApplication,WorkbenchRoot} from '/apps/workbench-web/src/workbench-root.tsx';
import {ExtensionLibrary} from '/apps/workbench-web/src/components/extensions/extension-library.tsx';
import {initializeAppearanceTheme} from '/apps/workbench-web/src/appearance-theme.ts';
import '/apps/workbench-web/src/styles/app.scss';
initializeAppearanceTheme();
const application=await createWebWorkbenchApplication({hostProfileMode:'configured',navigationMode:'memory',lightVelaApiBase:location.origin+'/fixture-account'});
const supervisor=application.supervisor;
createIntlTestRoot(document.getElementById('app')).render(<WorkbenchRoot application={application}/>);
createIntlTestRoot(document.getElementById('library')).render(<ExtensionLibrary manager={supervisor.extensionManager} supervisor={supervisor.extensions}/>);
window.builtinProof={
 snapshot:()=>supervisor.extensionManager.getSnapshot().extensions.find(row=>row.installation.extensionId==='lightvela.collaboration'),
 navigation:()=>supervisor.extensions.contributions.getSnapshot().navigation.map(row=>row.contribution.title),
 route:()=>supervisor.navigation.getSnapshot().applicationRoute.kind,
 platformActive:()=>supervisor.extensions.getSnapshot().extensions.some(row=>row.id==='lightvela.platform' && row.status==='active'),
};
document.body.dataset.ready='true';`;
const server = await createServer({ configFile: false, root: process.cwd(), logLevel: "error",
  define: { "process.env.NEXT_PUBLIC_REGION": '"cn"', "process.env.NEXT_PUBLIC_PREVIEW_LOCALES": '""',
    "import.meta.env.VITE_INCLUDE_HYPERNODE_PLUGIN": '"false"', "import.meta.env.VITE_INCLUDE_BUILTIN_AGENTS_PLUGIN": '"false"' },
  esbuild: { jsx: "automatic" }, resolve: { dedupe: ["react", "react-dom"] },
  server: { host: "127.0.0.1", port: 0 }, plugins: [{
    name: "optional-builtin-proof", resolveId: id => id === "/builtin-proof.tsx" ? id : null,
    load: id => id === "/builtin-proof.tsx" ? source : null,
    configureServer(vite) { vite.middlewares.use((req, res, next) => {
      if (req.url === "/") {
        res.setHeader("Content-Type", "text/html");
        res.end('<html><body><div id="app"></div><aside id="library" style="position:fixed;right:20px;top:100px;width:500px;max-height:700px;overflow:auto;z-index:1000;background:var(--color-background);padding:20px"></aside><script type="module" src="/builtin-proof.tsx"></script></body></html>');
      } else if (req.url?.startsWith("/fixture-account")) {
        res.statusCode = 401; res.end('Anonymous fixture');
      } else next();
    }); },
  }],
});
let browser: any;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, executablePath: process.env.OPENCRAFT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript("window.__name = target => target;");
  const errors: string[] = []; page.on("pageerror", (error: Error) => errors.push(error.message));
  await page.goto(server.resolvedUrls!.local[0]);
  await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
  const library = page.locator('#library');
  await library.getByLabel('搜索扩展').fill('Collaboration');
  const enable = library.getByRole('switch', { name: '启用 LightVela Collaboration' });
  await enable.waitFor();
  assert.equal(await enable.isChecked(), false);
  assert.equal(await page.evaluate(() => (window as any).builtinProof.navigation().includes('Collaboration')), false);
  const navigation = page.getByRole('navigation', { name: 'Applications', exact: true });
  const openApplications = async () => {
    if (!await navigation.isVisible()) await page.locator('.shell-navigation__entrance[data-surface="applications"]').click();
  };
  await openApplications();
  await navigation.getByRole('button', { name: 'Chat', exact: true }).waitFor();
  assert.equal(await navigation.getByRole('button', { name: 'Collaboration', exact: true }).count(), 0);
  await enable.click();
  await library.getByRole('switch', { name: '停用 LightVela Collaboration' }).waitFor();
  await openApplications();
  await navigation.getByRole('button', { name: 'Collaboration', exact: true }).waitFor();
  await page.reload();
  await page.waitForSelector('body[data-ready="true"]');
  await library.getByLabel('搜索扩展').fill('Collaboration');
  await library.getByRole('switch', { name: '停用 LightVela Collaboration' }).waitFor();
  assert.equal(await page.evaluate(() => (window as any).builtinProof.navigation().includes('Collaboration')), true);
  await openApplications();
  await navigation.getByRole('button', { name: 'Collaboration', exact: true }).click();
  await page.waitForFunction(() => (window as any).builtinProof.route() === 'extension-view');
  await library.getByRole('button', { name: '查看 LightVela Collaboration 详情' }).click();
  assert.equal(await library.getByRole('button', { name: '移除扩展', exact: true }).count(), 0);
  assert.equal(await library.getByRole('button', { name: '从来源更新', exact: true }).count(), 0);
  await library.getByRole('button', { name: '停用', exact: true }).click();
  await library.getByRole('button', { name: '启用', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => (window as any).builtinProof.navigation().includes('Collaboration')), false);
  await page.waitForFunction(() => (window as any).builtinProof.route() === 'conversation');
  assert.equal(await page.evaluate(() => (window as any).builtinProof.platformActive()), true);
  await page.reload();
  await page.waitForSelector('body[data-ready="true"]');
  await library.getByLabel('搜索扩展').fill('Collaboration');
  await library.getByRole('switch', { name: '启用 LightVela Collaboration' }).waitFor();
  assert.equal(await page.evaluate(() => (window as any).builtinProof.snapshot().installation.enabled), false);
  assert.deepEqual(errors, []);
  await mkdir('.local/collaboration-verification', { recursive: true });
  await page.screenshot({ path: '.local/collaboration-verification/default-disabled.png' });
  console.log('PASS: real Web bootstrap defaults Collaboration off; extension controls enable navigation, restore choice, disable and protect bundled source; account provider stays active.');
} finally {
  await browser?.close();
  await server.close();
}
