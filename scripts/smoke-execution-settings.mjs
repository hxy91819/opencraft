import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createWorkbenchWebServer } from './workbench-web-server.mjs';

// Read-only settings navigation on the built app; no inference or configuration writes.
const liveUrl = process.env.OPENCRAFT_SETTINGS_TEST_URL;
const directory = process.env.OPENCRAFT_SETTINGS_PROOF_DIRECTORY || '.local/execution-settings';
await mkdir(directory, { recursive: true });
const server = liveUrl ? null : await createWorkbenchWebServer({
  root: 'apps/workbench-web/dist', appServerTarget: 'ws://127.0.0.1:9989/rpc',
  codexServerTarget: 'ws://127.0.0.1:9988/rpc/codex',
});
const address = await server?.listen({ host: '127.0.0.1', port: 0 });
const url = liveUrl || `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ executablePath: process.env.OPENCRAFT_CHROMIUM_EXECUTABLE, args: ['--no-sandbox', ...(liveUrl ? ['--host-resolver-rules=MAP opencraft.preview.test 127.0.0.1'] : [])] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true, locale: 'zh-CN' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${url}/settings/execution-local`);
  if (await page.locator('input[name="username"]').count()) {
    const password = (await readFile(process.env.OPENCRAFT_PREVIEW_PASSWORD_FILE, 'utf8')).trim();
    await page.locator('input[name="username"]').fill('preview');
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();
    await page.goto(`${url}/settings/execution-local`);
  }
  const navigation = page.getByRole('navigation', { name: 'Settings sections' });
  await page.getByRole('heading', { name: '执行端概览', exact: true }).waitFor({ timeout: 60000 });
  const hosts = navigation.locator('.settings-execution-navigation');
  assert.equal(await hosts.count(), 2);
  const dsh = hosts.filter({ hasText: 'OpenCraft Server' });
  const codex = hosts.filter({ hasText: 'Codex' });
  assert.equal(await navigation.getByText('服务器', { exact: true }).count(), 0);
  assert.equal(await dsh.getByRole('button', { name: '模型服务', exact: true }).count(), 1);
  assert.equal(await dsh.getByRole('button', { name: 'Codex 账户', exact: true }).count(), 0);
  assert.equal(await codex.getByRole('button', { name: 'Codex 账户', exact: true }).count(), 1);
  assert.equal(await navigation.getByRole('button', { name: '概览', exact: true }).count(), 0);
  const dshEntry = dsh.getByRole('button', { name: 'OpenCraft Server', exact: true });
  const codexEntry = codex.getByRole('button', { name: 'Codex', exact: true });
  assert.equal(await dshEntry.getAttribute('aria-current'), 'page');
  await codexEntry.focus();
  await codexEntry.press('Enter');
  await page.getByRole('heading', { name: '执行端概览', exact: true }).waitFor();
  assert.match(await page.locator('header[aria-label="配置所属执行端"]').innerText(), /Codex/);
  assert.equal(await codexEntry.getAttribute('aria-current'), 'page');
  assert.equal(await dshEntry.getAttribute('aria-current'), null);
  await dshEntry.click();
  assert.match(await page.locator('header[aria-label="配置所属执行端"]').innerText(), /OpenCraft Server/);
  await dsh.getByRole('button', { name: '模型服务', exact: true }).click();
  await page.locator('.model-services').waitFor({ timeout: 30000 });
  assert.equal(await dshEntry.getAttribute('aria-current'), null);
  assert.equal(await dsh.getByRole('button', { name: '模型服务', exact: true }).getAttribute('aria-current'), 'page');
  assert.match(await page.locator('header[aria-label="配置所属执行端"]').innerText(), /OpenCraft Server/);
  const geometry = await page.locator('.settings-page__content').evaluate(el => ({ height: el.clientHeight, scrollHeight: el.scrollHeight, childHeight: el.lastElementChild.getBoundingClientRect().height }));
  assert.ok(geometry.childHeight > 200, JSON.stringify(geometry));
  assert.ok(geometry.scrollHeight <= geometry.height + 2, JSON.stringify(geometry));
  assert.equal(await dsh.locator('svg.lucide-brain').count(), 1);
  assert.equal(await codex.locator('svg.lucide-user-round').count(), 1);
  await codex.getByRole('button', { name: 'Codex', exact: true }).click();
  await page.getByRole('heading', { name: '执行端概览', exact: true }).waitFor();
  assert.match(await page.locator('header[aria-label="配置所属执行端"]').innerText(), /Codex/);
  await page.goBack();
  await page.locator('.model-services').waitFor();
  assert.match(await page.locator('header[aria-label="配置所属执行端"]').innerText(), /OpenCraft Server/);
  await page.goForward();
  await page.getByRole('heading', { name: '执行端概览', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: '执行端概览', exact: true }).waitFor();
  assert.match(await page.locator('.settings-execution-endpoint').innerText(), /\/codex-appserver$/);
  await page.screenshot({ path: `${directory}/overview.png` });
  await navigation.getByRole('button', { name: '外观', exact: true }).click();
  await page.getByRole('radio', { name: /^(Dark|深色)$/ }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await codex.getByRole('button', { name: 'Codex', exact: true }).click();
  await page.screenshot({ path: `${directory}/overview-dark.png` });
  await navigation.getByRole('button', { name: '外观', exact: true }).click();
  await page.getByRole('radio', { name: /^(Light|浅色)$/ }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await codex.getByRole('button', { name: 'Codex', exact: true }).click();
  await codex.getByRole('button', { name: 'Codex 账户', exact: true }).click();
  await page.locator('.codex-account-list').waitFor();
  assert.match(await page.locator('header[aria-label="配置所属执行端"]').innerText(), /Codex/);
  await codex.getByRole('button', { name: 'Codex', exact: true }).click();
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.screenshot({ path: `${directory}/overview-narrow.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ url, hosts: 2, pushPopReload: true, keyboardActivation: true, parentSelection: true, configurationOwnership: true, masterDetailGeometry: geometry, pageErrors: errors }));
} finally { await browser.close(); await server?.close(); }
