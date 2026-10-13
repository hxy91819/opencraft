#!/usr/bin/env node
import { mkdir, readFile, writeFile, cp, rm, chmod } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import semver from 'semver';
import { parseNpmPackResult } from './web-deployment/npm-pack-result.mjs';
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function packageWebServer({ version, webRoot = join(repositoryRoot, 'apps/workbench-web/dist'), output, execution = false }) {
  if (!semver.valid(version)) throw new Error('Set OPENCRAFT_RELEASE_VERSION to an exact npm version');
  const directory = resolve(output);
  const packageRoot = join(directory, 'package');
  await mkdir(directory, { recursive: true });
  await rm(packageRoot, { recursive: true, force: true });
  await mkdir(join(packageRoot, 'runtime'), { recursive: true });
  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'packaging/web-server/package.json'), 'utf8'));
  const web = JSON.parse(await readFile(join(webRoot, 'version.json'), 'utf8'));
  if (typeof web.buildId !== 'string') throw new Error('Build the Web release before packaging');
  await cp(webRoot, join(packageRoot, 'web'), { recursive: true, filter: source => !source.endsWith('.map') });
  const indexPath = join(packageRoot, 'web/index.html');
  const html = await readFile(indexPath, 'utf8');
  await writeFile(indexPath, html.replace('</head>', '<meta name="opencraft-web-updates" content="/__opencraft_updates"></head>'));
  manifest.version = version;
  manifest.opencraftWeb = { schemaVersion: 1, workerProtocol: 1, buildId: web.buildId };
  await writeFile(join(packageRoot, 'package.json'), JSON.stringify(manifest, null, 2));
  await cp(join(repositoryRoot, 'docs/web-deployment.md'), join(packageRoot, 'README.md'));
  await cp(join(repositoryRoot, 'packaging/web-server/opencraft-web.service'), join(packageRoot, 'opencraft-web.service'));
  for (const entry of ['cli', 'worker']) {
    await build({ entryPoints: [join(repositoryRoot, `scripts/web-deployment/${entry}.mjs`)], outfile: join(packageRoot, `runtime/${entry}.mjs`),
      bundle: true, platform: 'node', format: 'esm', target: 'node22',
      external: ['bufferutil', 'utf-8-validate'], banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" } });
  }
  if (execution) {
    await mkdir(join(packageRoot, 'execution'));
    for (const [entry, target, format] of [
      ['scripts/server-deployment/gateway.mjs', 'gateway.mjs', 'esm'],
      ['apps/opencraft-daemon/src/bin.ts', 'daemon.cjs', 'cjs'],
      ['apps/local-agent-host/src/dsh-capability-plugin.mjs', 'dsh-capability-plugin.mjs', 'esm'],
    ]) {
      await build({ entryPoints: [join(repositoryRoot, entry)], outfile: join(packageRoot, 'execution', target),
        bundle: true, platform: 'node', format, target: 'node22', external: ['bufferutil', 'utf-8-validate'],
        plugins: [{ name: 'execution-pty', setup(builder) { builder.onResolve({ filter: /^node-pty$/ }, () => ({ path: './native/node-pty/lib/index.js', external: true })); } }],
        ...(format === 'esm' ? { banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" } } : {}) });
    }
    const ptyRoot = join(repositoryRoot, 'node_modules/node-pty');
    const prebuild = `prebuilds/${process.platform}-${process.arch}`;
    await cp(ptyRoot, join(packageRoot, 'execution/native/node-pty'), {
      recursive: true, dereference: true,
      filter: path => {
        const name = relative(ptyRoot, path).replaceAll('\\', '/');
        if (!name || ['package.json', 'LICENSE', 'lib', 'build', 'build/Release', 'prebuilds', prebuild].includes(name)) return true;
        if (name.startsWith('lib/')) return name.endsWith('.js') || name.endsWith('.d.ts');
        return (name.startsWith('build/Release/') || name.startsWith(`${prebuild}/`))
          && /(?:\.node|\.dll|\.exe|\/spawn-helper)$/.test(name);
      },
    });
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    manifest.engines.node = `>=${nodeMajor} <${nodeMajor + 1}`;
    manifest.os = [process.platform];
    manifest.cpu = [process.arch];
    manifest.opencraftExecution = { protocolVersion: 1, platform: process.platform, arch: process.arch, nodeAbi: process.versions.modules };
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify(manifest, null, 2));
    await cp(join(repositoryRoot, 'packaging/web-server/opencraft-execution.service'), join(packageRoot, 'opencraft-execution.service'));
  }
  await chmod(join(packageRoot, 'runtime/cli.mjs'), 0o755);
  const { stdout } = await promisify(execFile)('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { cwd: packageRoot, maxBuffer: 16 * 1024 * 1024 });
  const result = parseNpmPackResult(JSON.parse(stdout));
  return { version, buildId: web.buildId, packageRoot, archive: join(directory, result.filename), integrity: result.integrity, sha: result.shasum };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await packageWebServer({ version: process.env.OPENCRAFT_RELEASE_VERSION,
    execution: process.env.OPENCRAFT_PACKAGE_EXECUTION === '1',
    output: process.env.OPENCRAFT_WEB_PACKAGE_OUTPUT || join(repositoryRoot, '.local/web-packages') }), null, 2));
}
