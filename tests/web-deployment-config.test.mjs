import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { websiteDeploymentConfig, injectWebsiteDeploymentConfig, createWorkbenchWebServer } from '../scripts/workbench-web-server.mjs';

const local = { hostId: 'local', label: 'OpenCraft Server', kind: 'remote-control', url: '/appserver' };
const codex = { hostId: 'local-codex', label: 'Codex', kind: 'remote-control', url: '/codex-appserver' };
test('website derives stable Host identities and activation from configured proxies', () => {
  assert.deepEqual(websiteDeploymentConfig({ appServerTarget: 'ws://private/rpc', codexServerTarget: 'ws://private/codex' }), {
    hosts: [local, codex], builtinAgents: true, hypernode: false,
  });
  assert.deepEqual(websiteDeploymentConfig({}), { hosts: [], builtinAgents: false, hypernode: false });
  assert.deepEqual(websiteDeploymentConfig({ appServerTarget: 'ws://private/rpc' }), { hosts: [local], builtinAgents: true, hypernode: false });
  assert.deepEqual(websiteDeploymentConfig({ codexServerTarget: 'ws://private/codex' }), { hosts: [codex], builtinAgents: true, hypernode: false });
  assert.deepEqual(websiteDeploymentConfig({ appServerTarget: 'ws://private/rpc', hyperNodeUser: 'user' }), {
    hosts: [local], builtinAgents: true, hypernode: false,
  });
});
test('inert config precedes module execution and escapes script terminators', () => {
  const html = injectWebsiteDeploymentConfig('<html><head><script type="module"></script></head></html>', { value: '</script><script>bad</script>' });
  assert.ok(html.indexOf('application/json') < html.indexOf('type="module"'));
  assert.equal((html.match(/<script/g) || []).length, 2);
  assert.ok(html.includes('\\u003c/script>'));
});
test('direct and SPA HTML requests receive uncached config with accurate GET/HEAD lengths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'web-config-'));
  let server;
  try {
    await writeFile(join(root, 'index.html'), '<html><head></head><body>中文</body></html>');
    await writeFile(join(root, 'embedded.html'), '<p>Standalone document</p>');
    server = await createWorkbenchWebServer({ root, appServerTarget: 'ws://127.0.0.1:9989/rpc', codexServerTarget: 'ws://127.0.0.1:9988/rpc/codex' });
    const base = `http://127.0.0.1:${(await server.listen({ port: 0 })).port}`;
    for (const path of ['/', '/index.html', '/settings/updates']) {
      const response = await fetch(base + path, { headers: { accept: 'text/html' } });
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('etag'), null);
      assert.equal(Number(response.headers.get('content-length')), Buffer.byteLength(html));
      assert.match(html, /local-codex/);
      assert.doesNotMatch(html, /9989|9988/);
      const head = await fetch(base + path, { method: 'HEAD', headers: { accept: 'text/html' } });
      assert.equal(head.headers.get('content-length'), response.headers.get('content-length'));
      assert.equal(await head.text(), '');
    }
    assert.equal(await (await fetch(base + '/embedded.html')).text(), '<p>Standalone document</p>');
  } finally { await server?.close(); await rm(root, { recursive: true, force: true }); }
});
