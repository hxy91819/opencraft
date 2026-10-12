import { test, expect } from '@playwright/test';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { WebSocketServer } from 'ws';
import { createManagedWebServer } from '../../scripts/web-deployment/server.mjs';
import { releaseFixture } from '../web-deployment-fixture.mjs';

// The production SPA, bundled worker/updater and real npm CLI are exercised.
// Only the registry and execution endpoint are local fixtures: no publishing,
// user credentials, existing deployment state or model inference is required.
let directory; let fixture; let app; let base; let backend; let probeConnections;
let pageErrors; let releaseLookup; let releaseDownload;
const api = '/__opencraft_updates';
const labels = {
  check: /^(Check updates|检查更新)$/,
  install: /^(Update website|更新网站)$/,
  rollback: /^(Roll back previous version|回退上一版)$/,
  authorize: /^(Authorize management|授权管理)$/,
  key: /^(Deployment administrator key|部署管理员密钥)$/,
  logout: /^(End administrator session|结束管理会话)$/,
};
const button = (page, name) => page.getByRole('button', { name: labels[name] });
const status = async page => page.evaluate(async path => (await fetch(path, { cache: 'no-store' })).json(), api);
async function check(page) {
  await button(page, 'check').click();
  await expect.poll(async () => { const s = await status(page); return !!s.checkedAt && !s.checking; }).toBe(true);
  await expect(button(page, 'check')).toBeEnabled();
}
async function authorize(page) {
  await page.getByLabel(labels.key).fill((await readFile(app.adminKeyPath, 'utf8')).trim());
  await button(page, 'authorize').click();
  await expect(button(page, 'install')).toBeVisible();
  await expect(page.getByLabel(labels.key)).toHaveCount(0);
}
async function assertCurrent(page, version) {
  await expect.poll(async () => (await status(page)).current.version).toBe(version);
  await expect(page.getByText(version, { exact: true }).first()).toBeVisible();
}
async function probe(page, text) {
  return page.evaluate(text => new Promise((accept, reject) => {
    const timeout = setTimeout(() => reject(new Error('Execution socket did not respond')), 3000);
    window.continuitySocket.onmessage = e => { clearTimeout(timeout); accept(e.data); };
    window.continuitySocket.send(text);
  }), `continuity:${text}`);
}

test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'opencraft-playwright-updates-'));
  const realWebRoots = {};
  for (const version of ['1.0.0', '1.1.0', '1.2.0', '1.3.0']) {
    const root = join(directory, `web-${version}`); realWebRoots[version] = root;
    await cp(resolve('apps/workbench-web/dist'), root, { recursive: true });
    const versionPath = join(root, 'version.json');
    const metadata = JSON.parse(await readFile(versionPath, 'utf8'));
    const htmlPath = join(root, 'index.html');
    await writeFile(htmlPath, (await readFile(htmlPath, 'utf8')).replace(`content="${metadata.buildId}"`, `content="e2e-${version}"`));
    await writeFile(versionPath, JSON.stringify({ ...metadata, buildId: `e2e-${version}` }));
  }
  fixture = await releaseFixture(directory, { realWebRoots });
});
test.beforeEach(async ({ page }) => {
  fixture.select('1.1.0'); fixture.lookupError(null); fixture.holdLookup(null); fixture.holdDownload(null); fixture.failDownload(false);
  probeConnections = new Set(); pageErrors = []; releaseLookup = null; releaseDownload = null;
  page.on('pageerror', error => pageErrors.push(error.message));
  backend = new WebSocketServer({ host: '127.0.0.1', port: 0 }); await once(backend, 'listening');
  backend.on('connection', socket => socket.on('message', data => {
    const text = data.toString();
    if (text.startsWith('continuity:')) { probeConnections.add(socket); socket.send(text); }
    else {
      const request = JSON.parse(text);
      if (request.id != null) socket.send(JSON.stringify({ id: request.id, error: { code: -32601, message: 'No execution in this fixture' } }));
    }
  }));
  const stateDirectory = await mkdtemp(join(directory, 'state-'));
  app = await createManagedWebServer({ initialRelease: fixture.releases.get('1.0.0').packageRoot,
    stateDirectory, registry: fixture.registry, userconfig: fixture.userconfig,
    appServerTarget: `ws://127.0.0.1:${backend.address().port}/rpc`,
    codexServerTarget: `ws://127.0.0.1:${backend.address().port}/rpc/codex` });
  base = `http://127.0.0.1:${(await app.listen({ port: 0 })).port}`;
  await page.goto(`${base}/settings/updates`);
  await expect(button(page, 'check')).toBeVisible();
});
test.afterEach(async () => {
  releaseLookup?.(); releaseDownload?.(); fixture.holdLookup(null); fixture.holdDownload(null);
  await app?.close(); app = null;
  for (const socket of backend?.clients ?? []) socket.terminate();
  if (backend) await new Promise(done => backend.close(done));
  expect(pageErrors).toEqual([]);
});
test.afterAll(async () => { await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

test('generic release discovers runtime Codex Host and built-in settings before and after update', async ({ page }) => {
  const assertDeployment = async () => {
    const config = await page.locator('#opencraft-deployment-config').textContent();
    expect(JSON.parse(config)).toEqual({ hosts: [
      { hostId: 'local', label: 'OpenCraft Server', kind: 'remote-control', url: '/appserver' },
      { hostId: 'local-codex', label: 'Codex', kind: 'remote-control', url: '/codex-appserver' },
    ], builtinAgents: true, hypernode: false });
    const profiles = await page.evaluate(async () => {
      const db = await new Promise((accept, reject) => {
        const request = indexedDB.open('vela-host-connections');
        request.onsuccess = () => accept(request.result); request.onerror = () => reject(request.error);
      });
      try { return await new Promise((accept, reject) => {
        const request = db.transaction('profiles').objectStore('profiles').getAll();
        request.onsuccess = () => accept(request.result.map(profile => profile.hostId).sort());
        request.onerror = () => reject(request.error);
      }); } finally { db.close(); }
    });
    expect(profiles).toEqual(['local', 'local-codex']);
    const nav = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(nav.getByRole('button', { name: /^(Model services|模型服务)$/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /^(Codex accounts|Codex 账户)$/ })).toBeVisible();
  };
  await assertDeployment();
  await check(page); await authorize(page); await button(page, 'install').click();
  await expect.poll(async () => (await status(page)).job?.phase).toBe('completed');
  await page.reload(); await expect(button(page, 'check')).toBeVisible();
  await assertDeployment();
});

test('legacy generic website restores HyperNode draft links and selections on local without a duplicate Host', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    // The pre-runtime generic website has no HTML config and activates its
    // ephemeral HyperNode profile. Exercise that actual startup before upgrade.
    const legacyHtml = async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/<script id="opencraft-deployment-config" type="application\/json">.*?<\/script>/s, '');
      await route.fulfill({ response, body });
    };
    await page.route(url => url.pathname === '/', legacyHtml);
    await page.goto(`${base}/?hostId=hypernode&draftId=legacy-draft`);
    await expect(page.getByRole('button', { name: '运行在', exact: true })).toContainText('HyperNode');
    await page.evaluate(() => {
      localStorage.setItem('vela.active-host-id', 'hypernode');
      localStorage.setItem('vela.active-thread-id:hypernode', 'legacy-thread');
      localStorage.setItem('vela.selected-project-id:hypernode', 'legacy-project');
    });
    await page.unrouteAll();
    await page.reload();
    await expect(page.getByRole('button', { name: '运行在', exact: true })).toContainText('OpenCraft Server');
    await expect(page).toHaveURL(/hostId=local&draftId=legacy-draft/);
    expect(await page.evaluate(() => [
      localStorage.getItem('vela.active-thread-id:local'), localStorage.getItem('vela.selected-project-id:local'),
      localStorage.getItem('vela.active-thread-id:hypernode'),
    ])).toEqual(['legacy-thread', 'legacy-project', 'legacy-thread']);
    await page.goto(`${base}/settings/updates`);
    await expect(button(page, 'check')).toBeVisible();
    await expect(page.locator('.settings-execution-navigation')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'HyperNode', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('anonymous check finds the real npm release and preserves the administrator draft during lookup', async ({ page }) => {
  expect((await status(page)).authenticated).toBe(false);
  await expect(button(page, 'install')).toHaveCount(0);
  const input = page.getByLabel(labels.key);
  await input.fill('unsaved-draft');
  const before = await input.boundingBox();
  fixture.holdLookup(new Promise(done => { releaseLookup = done; }));
  await button(page, 'check').click();
  await expect.poll(async () => (await status(page)).checking).toBe(true);
  await expect(button(page, 'check')).toBeDisabled(); await expect(input).toBeEnabled();
  await input.fill('edited-while-checking');
  expect(await input.boundingBox()).toEqual(before);
  releaseLookup(); fixture.holdLookup(null);
  await expect(page.getByText('1.1.0', { exact: true })).toBeVisible();
  const result = await status(page);
  expect(result.latest).toEqual({ version: '1.1.0', buildId: 'e2e-1.1.0' });
  expect(result.checkError).toBeNull(); expect(result.updateAvailable).toBe(true);
  expect(result.current.version).toBe('1.0.0'); expect(result.job).toBeNull();
  await expect(input).toHaveValue('edited-while-checking');
});

for (const code of [400, 404]) test(`missing release (${code}) is not reported as a credentials failure`, async ({ page }) => {
  fixture.lookupError({ status: code, message: 'npm包[@tencent/opencraft-web]不存在' });
  await check(page);
  await expect(page.getByText(/^(No published release|暂无发布版本)$/)).toBeVisible();
  await expect(page.getByText(/Company npm request failed|npm 认证失败/)).toHaveCount(0);
  const result = await status(page);
  expect(result.checkError).toBeNull(); expect(result.latest).toBeNull(); expect(result.updateAvailable).toBe(false);
  await assertCurrent(page, '1.0.0');
  await authorize(page); await expect(button(page, 'install')).toBeDisabled();
});

for (const [code, kind, text] of [
  [401, 'authentication', /Company npm authentication failed|公司 npm 认证失败/],
  [503, 'network', /Cannot reach the company npm registry|无法连接公司 npm 源/],
  [400, 'registry', /The company npm registry rejected|公司 npm 源拒绝/],
]) test(`lookup failure ${code} is actionable and a retry recovers`, async ({ page }) => {
  fixture.lookupError({ status: code, message: 'private-registry-detail-do-not-expose' });
  await check(page); await expect(page.getByText(text)).toBeVisible();
  expect((await status(page)).checkErrorCode).toBe(kind);
  await expect(page.getByText('private-registry-detail-do-not-expose')).toHaveCount(0);
  await expect(page.getByText(/^(Check failed|检查失败)$/)).toBeVisible();
  fixture.lookupError(null); await check(page);
  await expect(page.getByText('1.1.0', { exact: true })).toBeVisible();
  await expect(page.getByText(text)).toHaveCount(0);
  expect((await status(page)).checkError).toBeNull();
});

test('install and rollback preserve the execution WebSocket and serve the selected build to new pages', async ({ page, context }) => {
  await check(page); await authorize(page);
  await page.evaluate(() => new Promise((accept, reject) => {
    window.continuitySocket = new WebSocket(`${location.origin.replace('http:', 'ws:')}/appserver`);
    window.continuitySocket.onopen = () => accept(); window.continuitySocket.onerror = () => reject(new Error('Cannot open execution socket'));
  }));
  expect(await probe(page, 'before')).toBe('continuity:before');
  fixture.holdDownload(new Promise(done => { releaseDownload = done; }));
  await button(page, 'install').click();
  await expect.poll(async () => (await status(page)).job?.phase).toBe('downloading');
  expect(await probe(page, 'during')).toBe('continuity:during');
  await expect(button(page, 'install')).toBeDisabled();
  releaseDownload(); fixture.holdDownload(null);
  await assertCurrent(page, '1.1.0');
  await expect.poll(async () => (await status(page)).job?.phase).toBe('completed');
  await expect(button(page, 'rollback')).toBeEnabled();
  expect(await probe(page, 'upgraded')).toBe('continuity:upgraded');
  await expect(page.getByText(/This page is still displaying the previous build|当前页面仍显示旧版/)).toBeVisible();
  const fresh = await context.newPage();
  await fresh.goto(`${base}/settings/updates`); await expect(button(fresh, 'check')).toBeVisible();
  expect(await fresh.locator('meta[name="opencraft-build-id"]').getAttribute('content')).toBe('e2e-1.1.0');
  await fresh.close();
  await button(page, 'rollback').click(); await assertCurrent(page, '1.0.0');
  await expect.poll(async () => (await status(page)).job?.phase).toBe('completed');
  expect(await probe(page, 'rolled-back')).toBe('continuity:rolled-back'); expect(probeConnections.size).toBe(1);
  const persisted = JSON.parse(await readFile(join(app.adminKeyPath, '..', 'deployment.json'), 'utf8'));
  expect(persisted.current.version).toBe('1.0.0');
  await button(page, 'logout').click(); await expect(page.getByLabel(labels.key)).toBeVisible();
  await expect(button(page, 'install')).toHaveCount(0);
});

test('failed worker startup retains the installed site and can be retried with a healthy release', async ({ page }) => {
  fixture.select('1.2.0'); await check(page); await authorize(page);
  await button(page, 'install').click();
  await expect.poll(async () => (await status(page)).job?.phase).toBe('failed');
  await expect(page.getByText(/New Web worker exited before readiness/)).toBeVisible();
  await assertCurrent(page, '1.0.0');
  fixture.select('1.1.0'); await check(page); await button(page, 'install').click();
  await assertCurrent(page, '1.1.0');
  await expect.poll(async () => (await status(page)).job?.phase).toBe('completed');
});

test('management requires authorization and cross-origin requests cannot start an operation', async ({ page }) => {
  const codes = await page.evaluate(async api => {
    const post = (name, input = {}) => fetch(`${api}/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }).then(r => r.status);
    return [await post('install', { version: '1.1.0' }), await post('rollback'), await post('login', { key: 'wrong' })];
  }, api);
  expect(codes).toEqual([401, 401, 401]);
  const foreign = await page.request.post(`${base}${api}/check`, { headers: { origin: 'https://foreign.test' }, data: {} });
  expect(foreign.status()).toBe(403);
  expect((await status(page)).job).toBeNull();
  await check(page); expect((await status(page)).latest.version).toBe('1.1.0');
});
