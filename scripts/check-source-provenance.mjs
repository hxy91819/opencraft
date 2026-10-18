#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const statuses = new Set(['unverified', 'original', 'third-party-licensed', 'independently-reimplemented', 'excluded']);
const markers = /restored (?:and typed )?from Codex|recovered (?:from )?Codex|behavior follows Codex Desktop|Codex r822|reference:\/\/codex|ref\/codex\/|source-identical|recovered\/assets/iu;
const ignored = new Set(['node_modules', '.git', '.local', 'dist', 'build', '.expo']);

async function files(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = prefix + entry.name;
    if (entry.isDirectory()) found.push(...await files(resolve(directory, entry.name), path + '/'));
    else if (entry.isFile()) found.push(path);
  }
  return found.sort();
}
function matches(path, pattern) {
  return pattern.endsWith('/**') ? path.startsWith(pattern.slice(0, -2)) : path === pattern;
}
function validPath(path) {
  return typeof path === 'string' && path.length > 0 && !path.startsWith('/')
    && !path.includes('\\') && path.split('/').every(segment => segment && segment !== '.' && segment !== '..');
}

export async function inspectProvenance(directory = root) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'config/source-provenance.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries) || manifest.intendedOriginalLicense !== 'Apache-2.0') throw new Error('Invalid source provenance manifest');
  const allFiles = await files(directory);
  const errors = [];
  const ids = new Set();
  const entries = [];
  for (const entry of manifest.entries) {
    if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || !statuses.has(entry.status)
      || !Array.isArray(entry.paths) || !entry.paths.length || !entry.paths.every(validPath)
      || !Array.isArray(entry.evidence) || !entry.evidence.length || !entry.evidence.every(validPath)
      || typeof entry.reason !== 'string' || !entry.reason || typeof entry.resolution !== 'string' || !entry.resolution) throw new Error('Invalid provenance entry');
    ids.add(entry.id);
    for (const evidence of entry.evidence) if (!allFiles.includes(evidence)) errors.push(`${entry.id}: missing evidence ${evidence}`);
    const selected = allFiles.filter(path => entry.paths.some(pattern => matches(path, pattern)));
    if (entry.status === 'excluded' && selected.length) errors.push(`${entry.id}: excluded material is still present`);
    if (entry.status !== 'excluded' && !selected.length) errors.push(`${entry.id}: no matching source; record its actual disposition`);
    if (entry.status !== 'unverified' && entry.status !== 'excluded'
      && (typeof entry.conclusion !== 'string' || !entry.conclusion.trim())) errors.push(`${entry.id}: missing rights/implementation conclusion`);
    const selectedFiles = [];
    for (const path of selected) selectedFiles.push({ path, sha256: createHash('sha256').update(await readFile(resolve(directory, path))).digest('hex') });
    entries.push({ ...entry, files: selectedFiles });
  }
  // Catch new source annotations that have not been added to the inventory.
  // Documentation outside executable packages remains evidence, not a claim
  // that all behavioral references are copied or require the same treatment.
  for (const path of allFiles) {
    if (!/^(apps|packages)\//u.test(path) || !/\.(?:[cm]?[jt]sx?|scss|css|json|md)$/u.test(path)) continue;
    if (markers.test(await readFile(resolve(directory, path), 'utf8'))
      && !manifest.entries.some(entry => entry.paths.some(pattern => matches(path, pattern)))) errors.push(`Untracked source provenance annotation: ${path}`);
  }
  const unresolved = entries.filter(entry => entry.status === 'unverified').map(entry => entry.id);
  return { schemaVersion: 1, intendedOriginalLicense: manifest.intendedOriginalLicense,
    releaseReady: errors.length === 0 && unresolved.length === 0, errors, unresolved, entries };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--release', '--json'].includes(arg))) throw new Error('Usage: node scripts/check-source-provenance.mjs [--json] [--release]');
  const report = await inspectProvenance();
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    for (const entry of report.entries) console.log(`${entry.status}: ${entry.id} (${entry.files.length} files)`);
    for (const error of report.errors) console.error(error);
    console.log(report.releaseReady ? 'Source provenance inventory resolved.' : 'Source provenance unresolved; public release is not ready.');
  }
  if (report.errors.length || (args.includes('--release') && !report.releaseReady)) process.exitCode = 1;
}
