import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectProvenance } from '../scripts/check-source-provenance.mjs';

async function fixture(t, status = 'unverified', overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'source-provenance-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'config'));
  await mkdir(join(root, 'packages/example'), { recursive: true });
  await writeFile(join(root, 'packages/example/index.ts'), '// Restored from Codex\nexport const value = 1;\n');
  await writeFile(join(root, 'evidence.md'), 'Source investigation');
  await writeFile(join(root, 'config/source-provenance.json'), JSON.stringify({ schemaVersion: 1, intendedOriginalLicense: 'Apache-2.0', entries: [{
    id: 'example', status, paths: ['packages/example/**'], evidence: ['evidence.md'], reason: 'Source annotation', resolution: 'Review or replace', ...overrides,
  }] }));
  return root;
}
test('unverified source reports pinned content and cannot become release-ready', async t => {
  const report = await inspectProvenance(await fixture(t));
  assert.equal(report.releaseReady, false);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.unresolved, ['example']);
  assert.match(report.entries[0].files[0].sha256, /^[a-f0-9]{64}$/);
});
test('removing an inventory entry does not hide remaining source annotations', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'packages/uncleared.ts'), '// reference://codex/recovered/source\n');
  assert.match((await inspectProvenance(root)).errors.join('\n'), /Untracked.*uncleared/);
});
test('adapter provenance notes cannot disappear from the review inventory', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'packages/host-adapter'));
  await mkdir(join(root, 'packages/react-adapter'));
  await writeFile(join(root, 'packages/host-adapter/PROVENANCE.md'), 'Behavior was recovered from Codex r1501.\n');
  await writeFile(join(root, 'packages/react-adapter/PROVENANCE.md'), 'Its behavior follows Codex Desktop\'s combination of callbacks and pagination.\n');
  const report = await inspectProvenance(root);
  assert.equal(report.releaseReady, false);
  assert.deepEqual(report.errors, [
    'Untracked source provenance annotation: packages/host-adapter/PROVENANCE.md',
    'Untracked source provenance annotation: packages/react-adapter/PROVENANCE.md',
  ]);
});
test('ordinary behavior descriptions are not automatically classified as recovered source', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'packages/independent.ts'), '// Codex-style scrolling is a behavior reference, not source provenance.\n');
  assert.deepEqual((await inspectProvenance(root)).errors, []);
});
test('JavaScript copies and JSON source manifests cannot escape annotation inventory', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'apps/browser'), { recursive: true });
  await writeFile(join(root, 'apps/browser/manager.js'), '// Source class body copied from ref/codex/browser/manager.ts\n');
  await writeFile(join(root, 'apps/browser/source-manifest.json'), JSON.stringify({ source: 'ref/codex/browser/manager.ts' }));
  assert.deepEqual((await inspectProvenance(root)).errors, [
    'Untracked source provenance annotation: apps/browser/manager.js',
    'Untracked source provenance annotation: apps/browser/source-manifest.json',
  ]);
});
test('source-identical annotations remain visible in JavaScript helpers', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'packages/viewport.mjs'), '// Source-identical viewport helper\n');
  assert.match((await inspectProvenance(root)).errors.join('\n'), /Untracked.*viewport\.mjs/u);
});
test('resolved requires a conclusion; excluded requires actual removal', async t => {
  const missing = await inspectProvenance(await fixture(t, 'original'));
  assert.equal(missing.releaseReady, false);
  assert.match(missing.errors.join('\n'), /missing rights/);
  const excluded = await inspectProvenance(await fixture(t, 'excluded'));
  assert.match(excluded.errors.join('\n'), /still present/);
  const resolved = await inspectProvenance(await fixture(t, 'independently-reimplemented', { conclusion: 'New original implementation; evidence.md records the review.' }));
  assert.equal(resolved.releaseReady, true);
});
test('invalid paths, absent evidence and unknown statuses cannot silently clear an entry', async t => {
  await assert.rejects(inspectProvenance(await fixture(t, 'unverified', { paths: ['../escape'] })), /Invalid provenance entry/);
  await assert.rejects(inspectProvenance(await fixture(t, 'approved-by-magic')), /Invalid provenance entry/);
  const missing = await inspectProvenance(await fixture(t, 'original', { evidence: ['missing.md'], conclusion: 'Claim only' }));
  assert.equal(missing.releaseReady, false);
  assert.match(missing.errors.join('\n'), /missing evidence/);
});
