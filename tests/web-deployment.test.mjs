import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { c } from 'tar';
import { request as httpRequest } from 'node:http';
import { createConnection } from 'node:net';
import { once } from 'node:events';
import { createManagedWebServer } from '../scripts/web-deployment/server.mjs';
import { unpackRelease } from '../scripts/web-deployment/releases.mjs';
import { parseWebUpdateStatus } from '../packages/web-update-protocol/src/index.mjs';
import { releaseFixture } from './web-deployment-fixture.mjs';
const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
export async function until(read, predicate, limit = 30_000) {
  const end = Date.now() + limit;
  do { const value = await read(); if (predicate(value)) return value; await sleep(50); } while (Date.now() < end);
  throw new Error('Timed out waiting for update result');
}
test('npm package installs, switches without disconnecting existing execution sockets, rolls back and survives restart', { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'opencraft-update-test-'));
  const backend = new WebSocketServer({ host: '127.0.0.1', port: 0 }); await once(backend, 'listening');
  let backendConnections = 0;
  backend.on('connection', socket => { backendConnections++; socket.on('message', data => socket.send(data)); });
  let fixture; let app; let socket; let base; let cookie = ''; let failWrite = false; let failRecovery = false; let candidateCommitted = false;
  const stateDirectory = join(directory, 'state');
  const status = async () => parseWebUpdateStatus(await (await fetch(`${base}/__opencraft_updates`, { headers: { cookie } })).json());
  const post = (action, input = {}, overrides = {}) => fetch(`${base}/__opencraft_updates/${action}`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json', cookie, ...overrides }, body: JSON.stringify(input) });
  const open = async () => {
    app = await createManagedWebServer({ initialRelease: fixture.releases.get('1.0.0').packageRoot, stateDirectory,
      stateWriter: async (path, value) => {
        if (failWrite && value.job?.phase === 'downloading') { failWrite = false; throw new Error('Synthetic disk full'); }
        if (failRecovery && candidateCommitted && value.current.version !== '1.3.0') throw new Error('Synthetic sustained disk full');
        if (value.current.version === '1.3.0') { await sleep(400); candidateCommitted = true; }
        await writeFile(path, JSON.stringify(value));
      }, registry: fixture.registry, userconfig: fixture.userconfig, appServerTarget: `ws://127.0.0.1:${backend.address().port}/rpc` });
    base = `http://127.0.0.1:${(await app.listen({ port: 0 })).port}`;
  };
  try {
    fixture = await releaseFixture(directory); await open();
    assert.equal((await status()).current.version, '1.0.0');
    const malformed = await new Promise((accept, reject) => {
      const request = httpRequest(`${base}`, { path: '//[' }, response => { response.resume(); response.on('end', () => accept(response.statusCode)); });
      request.on('error', reject); request.end();
    });
    assert.equal(malformed, 400);
    const malformedSocket = createConnection({ host: '127.0.0.1', port: new URL(base).port });
    await once(malformedSocket, 'connect'); malformedSocket.write('GET //[ HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
    await once(malformedSocket, 'close'); assert.equal((await status()).current.version, '1.0.0');
    assert.equal((await post('check', {}, { origin: 'https://foreign.example' })).status, 403);
    assert.equal((await post('check')).status, 202);
    const anonymous = await until(status, result => !result.checking && result.latest !== null);
    assert.equal(anonymous.authenticated, false);
    assert.equal(anonymous.latest.version, '1.1.0');
    assert.equal(anonymous.current.version, '1.0.0');
    assert.equal(anonymous.job, null);
    assert.equal((await post('install', { version: '1.1.0' })).status, 401);
    assert.equal((await post('rollback')).status, 401);
    const key = (await readFile(app.adminKeyPath, 'utf8')).trim();
    assert.equal((await post('login', { key }, { origin: 'https://foreign.example' })).status, 403);
    assert.equal((await post('login', { key: 'bad' })).status, 401);
    const login = await post('login', { key }); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
    assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
    assert.equal((await status()).authenticated, true);
    socket = new WebSocket(base.replace('http:', 'ws:') + '/appserver'); await once(socket, 'open');
    let closed = false; socket.on('close', () => { closed = true; });
    const echo = async text => { const reply = once(socket, 'message'); socket.send(text); assert.equal((await reply)[0].toString(), text); };
    await echo('before');
    assert.equal((await post('check')).status, 202);
    const checked = await until(status, result => !result.checking && result.latest !== null);
    assert.equal(checked.latest.version, '1.1.0'); assert.equal(checked.updateAvailable, true);
    let releaseDownload; fixture.holdDownload(new Promise(resolve => { releaseDownload = resolve; }));
    assert.equal((await post('install', { version: '1.1.0' })).status, 202);
    assert.equal((await post('install', { version: '1.1.0' })).status, 409);
    assert.equal((await status()).current.version, '1.0.0'); await echo('downloading');
    releaseDownload(); fixture.holdDownload(null);
    const installed = await until(status, result => result.job?.phase === 'completed');
    assert.equal(installed.current.version, '1.1.0'); assert.equal(installed.canRollback, true);
    assert.equal((await (await fetch(`${base}/version.json`)).json()).buildId, 'build-1.1.0');
    assert.match(await (await fetch(`${base}/assets/lazy-100abcdef.js`)).text(), /1.0.0/);
    await echo('after-update'); assert.equal(closed, false); assert.equal(backendConnections, 1);
    assert.equal((await post('rollback')).status, 202);
    await until(status, result => result.current.version === '1.0.0' && result.job.phase === 'completed');
    await assert.rejects(readFile(join(fixture.releases.get('1.0.0').packageRoot, 'web/assets/lazy-110abcdef.js')), { code: 'ENOENT' });
    assert.ok(JSON.parse(await readFile(join(stateDirectory, 'deployment.json'), 'utf8')).current.releaseRoot.startsWith(stateDirectory));
    await echo('after-rollback'); assert.equal(closed, false); assert.equal(backendConnections, 1);
    const expectedIntegrity = fixture.releases.get('1.1.0').manifest.dist.integrity;
    fixture.releases.get('1.1.0').manifest.dist.integrity = 'sha512-' + Buffer.alloc(64, 7).toString('base64');
    assert.equal((await post('check')).status, 202);
    await until(status, result => !result.checking && result.latest?.version === '1.1.0');
    assert.equal((await post('install', { version: '1.1.0' })).status, 202);
    const corrupt = await until(status, result => result.job?.version === '1.1.0' && result.job.phase === 'failed');
    assert.equal(corrupt.current.version, '1.0.0'); await echo('integrity-failure');
    fixture.releases.get('1.1.0').manifest.dist.integrity = expectedIntegrity;
    fixture.select('1.2.0'); assert.equal((await post('check')).status, 202);
    await until(status, result => !result.checking && result.latest?.version === '1.2.0');
    assert.equal((await post('install', { version: '1.2.0' })).status, 202);
    const failed = await until(status, result => result.job?.phase === 'failed');
    assert.equal(failed.current.version, '1.0.0'); assert.match(failed.job.error, /readiness/); await echo('failed-update');
    fixture.select('1.3.0'); assert.equal((await post('check')).status, 202);
    await until(status, result => !result.checking && result.latest?.version === '1.3.0');
    failWrite = true;
    assert.equal((await post('install', { version: '1.3.0' })).status, 202);
    const diskFailure = await until(status, result => result.job?.version === '1.3.0' && result.job.phase === 'failed');
    assert.match(diskFailure.job.error, /disk full/); assert.equal(diskFailure.current.version, '1.0.0');
    assert.equal((await post('install', { version: '1.3.0' })).status, 202);
    const activationFailure = await until(status, result => result.job?.phase === 'failed' && result.job.error?.includes('activation'));
    assert.equal(activationFailure.current.version, '1.0.0');
    assert.equal(JSON.parse(await readFile(join(stateDirectory, 'deployment.json'), 'utf8')).current.version, '1.0.0');
    await echo('worker-exited-before-activation');
    failRecovery = true; candidateCommitted = false;
    assert.equal((await post('install', { version: '1.3.0' })).status, 202);
    const recoveryFailure = await until(status, result => result.job?.phase === 'failed' && result.job.error?.includes('recovery could not be saved'));
    const uncertain = JSON.parse(await readFile(join(stateDirectory, 'deployment.json'), 'utf8'));
    assert.equal(uncertain.current.version, '1.3.0');
    await readFile(join(uncertain.current.releaseRoot, 'package.json'));
    assert.equal(recoveryFailure.current.version, '1.0.0'); await echo('persistent-write-failure');
    failRecovery = false;
    assert.equal((await post('install', { version: '1.3.0' })).status, 202);
    await until(status, result => result.job?.phase === 'failed' && result.job.error?.includes('activation'));
    assert.equal(JSON.parse(await readFile(join(stateDirectory, 'deployment.json'), 'utf8')).current.version, '1.0.0');
    const newSocket = new WebSocket(base.replace('http:', 'ws:') + '/appserver'); await once(newSocket, 'open'); newSocket.close(); await once(newSocket, 'close');
    socket.close(); await once(socket, 'close'); socket = null;
    await assert.rejects(() => createManagedWebServer({ initialRelease: fixture.releases.get('1.0.0').packageRoot, stateDirectory }), /already running/);
    await app.close(); app = null; await open(); cookie = '';
    assert.equal((await status()).current.version, '1.0.0'); assert.equal((await status()).authenticated, false);
    assert.equal((await status()).job.phase, 'failed');
    const pidPath = join(JSON.parse(await readFile(join(stateDirectory, 'deployment.json'), 'utf8')).current.releaseRoot, 'worker-pid');
    const oldPid = Number(await readFile(pidPath, 'utf8'));
    process.kill(oldPid, 'SIGKILL');
    await until(async () => Number(await readFile(pidPath, 'utf8')), pid => pid !== oldPid);
    await until(async () => (await fetch(`${base}/version.json`)).status, code => code === 200);
    assert.equal((await status()).current.version, '1.0.0');
    const response = await fetch(`${base}/crash-during-response`, { signal: AbortSignal.timeout(3000) });
    const responsePid = Number(await readFile(pidPath, 'utf8'));
    await assert.rejects(response.text());
    await until(async () => Number(await readFile(pidPath, 'utf8')), pid => pid !== responsePid);
    await until(async () => (await fetch(`${base}/version.json`)).status, code => code === 200);
    const saved = JSON.parse(await readFile(join(stateDirectory, 'deployment.json'), 'utf8'));
    saved.job = { id: 'interrupted', version: '1.1.0', phase: 'starting', error: null };
    await app.close(); app = null; await writeFile(join(stateDirectory, 'deployment.json'), JSON.stringify(saved)); await open();
    assert.match((await status()).job.error, /interrupted/); assert.equal((await status()).current.version, '1.0.0');
  } finally {
    socket?.terminate(); if (app) await app.close(); if (fixture) await fixture.close();
    for (const socket of backend.clients) socket.terminate(); await new Promise(resolve => backend.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
test('unsafe release archive is rejected before launching its worker', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'opencraft-archive-test-'));
  try {
    await mkdir(join(directory, 'package')); await symlink('/etc/passwd', join(directory, 'package/escape'));
    await c({ file: join(directory, 'unsafe.tgz'), cwd: directory, gzip: true }, ['package']);
    await assert.rejects(() => unpackRelease(join(directory, 'unsafe.tgz'), join(directory, 'unpacked')), /Unsafe/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
