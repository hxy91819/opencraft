import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readlink, symlink, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve, dirname } from 'node:path';
import { request } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const exec = promisify(execFile);
export async function coreHealth(endpoint, tokenPath) {
  const token = (await readFile(tokenPath, 'utf8')).trim();
  return new Promise((accept, reject) => {
    const req = request({ socketPath: endpoint, path: '/health', headers: { authorization: `Bearer ${token}` } }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; if (data.length > 8192) req.destroy(new Error('Invalid core health')); });
      response.on('end', () => {
        try {
          const value = JSON.parse(data);
          if (response.statusCode !== 200 || value.protocolVersion !== 1 || !Number.isInteger(value.pid) || !Number.isInteger(value.codexPid)) throw new Error();
          accept(value);
        } catch { reject(new Error('Codex core is unavailable or incompatible')); }
      });
      response.on('error', reject);
    });
    req.on('error', () => reject(new Error('Codex core health request failed')));
    req.setTimeout(5000, () => req.destroy(new Error('Core health timeout'))); req.end();
  });
}
async function unitProperties(unit) {
  const { stdout } = await exec('systemctl', ['show', unit, '--property=Id,ControlGroup,PartOf,BindsTo,PropagatesStopTo,ExecStart,StopWhenUnneeded,KillMode,MainPID,Conflicts,User,DynamicUser'], { timeout: 10_000 });
  return Object.fromEntries(stdout.trim().split('\n').map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
}
export async function assertIndependentUnits(unit, coreUnit, link, readProperties = unitProperties, health = null) {
  const [execution, core] = await Promise.all([readProperties(unit), readProperties(coreUnit)]);
  if (!core.ControlGroup || execution.ControlGroup === core.ControlGroup
    || (execution.ControlGroup && core.ControlGroup.startsWith(`${execution.ControlGroup}/`))
    || ['PartOf', 'BindsTo'].some(key => core[key]) || core.StopWhenUnneeded !== 'no'
    || execution.Conflicts?.split(' ').includes(core.Id) || core.Conflicts?.split(' ').includes(execution.Id)
    || execution.PropagatesStopTo || execution.KillMode !== 'control-group'
    || (health && Number(core.MainPID) !== health.pid)
    || !execution.ExecStart?.includes(`${link}/execution/gateway.mjs`))
    throw new Error('Execution service must use the managed gateway and an independent Codex core');
}
export async function grantExecutionAccess(releaseRoot, user, deploymentDirectory) {
  const { stdout } = await exec('id', ['-u', '--', user], { timeout: 5000 });
  const uid = Number(stdout.trim());
  if (!Number.isSafeInteger(uid) || uid < 0) throw new Error('Unknown execution user');
  if (uid === process.getuid?.()) return;
  // Grant only traversal to private deployment containers; code receives read access.
  const parents = new Set([deploymentDirectory, dirname(releaseRoot), dirname(dirname(releaseRoot))]);
  for (const parent of parents) await exec('setfacl', ['-m', `u:${uid}:--x`, '--', parent], { timeout: 10_000 });
  await exec('setfacl', ['-R', '-m', `u:${uid}:rX`, '--', releaseRoot], { timeout: 30_000 });
}
export function createExecutionDeployment({ link, unit, coreUnit, coreEndpoint, tokenPath, healthUrl,
  validate = health => assertIndependentUnits(unit, coreUnit, link, unitProperties, health),
  prepareAccess = async release => {
    const properties = await unitProperties(unit);
    if (properties.DynamicUser === 'yes') throw new Error('Managed execution requires a stable service user');
    await grantExecutionAccess(release.releaseRoot, properties.User || 'root', dirname(link));
  },
  restart = () => exec('systemctl', ['restart', unit], { timeout: 60_000 }), timeout = 30_000 }) {
  if (![link, coreEndpoint, tokenPath].every(isAbsolute) || !/^[A-Za-z0-9_.@-]+\.service$/.test(unit)
    || !/^[A-Za-z0-9_.@-]+\.service$/.test(coreUnit) || unit === coreUnit) throw new Error('Invalid managed execution configuration');
  const url = new URL(healthUrl);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) throw new Error('Execution health must use loopback HTTP');
  const pinsPath = `${link}.pins.json`;
  async function pinnedRoots() {
    try {
      const roots = JSON.parse(await readFile(pinsPath, 'utf8'));
      if (!Array.isArray(roots) || !roots.every(root => typeof root === 'string' && isAbsolute(root))) throw new Error('Invalid execution pins');
      return roots;
    } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  async function pin(roots) {
    const temporary = `${pinsPath}.${randomUUID()}.tmp`;
    try { await writeFile(temporary, JSON.stringify([...new Set(roots)]), { mode: 0o600 }); await rename(temporary, pinsPath); }
    finally { await rm(temporary, { force: true }); }
  }
  async function inspect(release) {
    const manifest = JSON.parse(await readFile(join(release.releaseRoot, 'package.json'), 'utf8'));
    const metadata = manifest.opencraftExecution;
    if (metadata?.protocolVersion !== 1 || metadata.platform !== process.platform || metadata.arch !== process.arch || metadata.nodeAbi !== process.versions.modules)
      throw new Error('Release has no compatible execution payload');
    for (const file of ['gateway.mjs', 'daemon.cjs', 'dsh-capability-plugin.mjs']) await readFile(join(release.releaseRoot, 'execution', file));
    await validate();
  }
  async function point(root) {
    const temporary = `${link}.${randomUUID()}.tmp`;
    try { await symlink(root, temporary); await rename(temporary, link); }
    finally { await rm(temporary, { force: true }); }
  }
  async function ready(release, before) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
        const health = await response.json();
        if (response.ok && health.ok && health.version === release.version && health.buildId === release.buildId) {
          const after = await coreHealth(coreEndpoint, tokenPath);
          if (after.pid !== before.pid || after.codexPid !== before.codexPid || health.core?.pid !== before.pid || health.core?.codexPid !== before.codexPid)
            throw new Error('Codex core changed during execution update');
          return;
        }
      } catch (error) { if (error.message === 'Codex core changed during execution update') throw error; }
      await delay(100);
    }
    throw new Error('Execution release failed readiness');
  }
  return {
    inspect,
    async status() {
      let target = null;
      try { target = JSON.parse(await readFile(join(link, 'package.json'), 'utf8')); } catch {}
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        const health = await response.json();
        if (!response.ok || health.ok !== true || typeof health.version !== 'string' || typeof health.buildId !== 'string') throw new Error();
        return { enabled: true, version: health.version, buildId: health.buildId,
          ready: health.version === target?.version && health.buildId === target?.opencraftWeb?.buildId };
      } catch { return { enabled: true, version: null, buildId: null, ready: false }; }
    },
    async referencedRoots() {
      const roots = await pinnedRoots();
      try { return [...new Set([...roots, resolve(link, '..', await readlink(link))])]; }
      catch { throw new Error('Execution release pointer is unreadable; retain release files'); }
    },
    async apply(release) {
      await inspect(release);
      const before = await coreHealth(coreEndpoint, tokenPath);
      await validate(before);
      let oldRoot;
      try { oldRoot = resolve(link, '..', await readlink(link)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await prepareAccess(release);
      await pin([...(await pinnedRoots()), ...(oldRoot ? [oldRoot] : []), release.releaseRoot]);
      // Startup also reconciles a pointer changed by an interrupted update.
      if (oldRoot !== release.releaseRoot) { await point(release.releaseRoot); await restart(); }
      else {
        try { await ready(release, before); await pin([release.releaseRoot]); return; }
        catch { await restart(); }
      }
      await ready(release, before);
      await pin([release.releaseRoot]);
    },
  };
}
