#!/usr/bin/env node
import { mkdir, readFile, writeFile, cp, rm, chmod } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import semver from 'semver';
import { parseNpmPackResult } from './web-deployment/npm-pack-result.mjs';
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function packageWebServer({ version, webRoot = join(repositoryRoot, 'apps/workbench-web/dist'), output }) {
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
  await chmod(join(packageRoot, 'runtime/cli.mjs'), 0o755);
  const { stdout } = await promisify(execFile)('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { cwd: packageRoot, maxBuffer: 16 * 1024 * 1024 });
  const result = parseNpmPackResult(JSON.parse(stdout));
  return { version, buildId: web.buildId, packageRoot, archive: join(directory, result.filename), integrity: result.integrity, sha: result.shasum };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await packageWebServer({ version: process.env.OPENCRAFT_RELEASE_VERSION,
    output: process.env.OPENCRAFT_WEB_PACKAGE_OUTPUT || join(repositoryRoot, '.local/web-packages') }), null, 2));
}
