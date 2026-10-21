import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  architectureSpecificRuntimeGlob,
  synchronizeRendererFiles,
  synchronizeRuntimeFiles,
} from "../scripts/merge-macos-universal.mjs";
import { signAndNotarizeMacos } from "../scripts/sign-notarize-macos.mjs";
import { notarizeMacosDmg } from "../scripts/notarize-macos-dmg.mjs";

test("universal merge synchronizes architecture-qualified runtime packages without overwriting shared files", async t => {
  const directory = await mkdtemp(join(tmpdir(), "opencraft-universal-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const x64 = join(directory, "x64/OpenCraft.app/Contents/Resources/runtime");
  const arm64 = join(directory, "arm64/OpenCraft.app/Contents/Resources/runtime");
  await Promise.all([mkdir(x64, { recursive: true }), mkdir(arm64, { recursive: true })]);
  await writeFile(join(x64, "shared.js"), "shared");
  await writeFile(join(arm64, "shared.js"), "shared");
  await mkdir(join(x64, "dsh/node_modules"), { recursive: true });
  await mkdir(join(arm64, "dsh/node_modules"), { recursive: true });
  await writeFile(join(x64, "dsh/node_modules/.package-lock.json"), "x64 inventory");
  await writeFile(join(arm64, "dsh/node_modules/.package-lock.json"), "arm64 inventory");
  await mkdir(join(x64, "node_modules/native-darwin-x64"), { recursive: true });
  await writeFile(join(x64, "node_modules/native-darwin-x64/addon.node"), "x64");
  await mkdir(join(arm64, "node_modules/native-darwin-arm64"), { recursive: true });
  await writeFile(join(arm64, "node_modules/native-darwin-arm64/addon.node"), "arm64");

  await synchronizeRuntimeFiles(
    join(directory, "x64/OpenCraft.app"),
    join(directory, "arm64/OpenCraft.app"),
  );

  assert.equal(await readFile(join(x64, "node_modules/native-darwin-arm64/addon.node"), "utf8"), "arm64");
  assert.equal(await readFile(join(arm64, "node_modules/native-darwin-x64/addon.node"), "utf8"), "x64");
  assert.equal(await readFile(join(x64, "shared.js"), "utf8"), "shared");
  await assert.rejects(readFile(join(x64, "dsh/node_modules/.package-lock.json")), /ENOENT/u);
  await assert.rejects(readFile(join(arm64, "dsh/node_modules/.package-lock.json")), /ENOENT/u);
  assert.match(architectureSpecificRuntimeGlob, /runtime/u);
  assert.match(architectureSpecificRuntimeGlob, /arm64/u);
  assert.match(architectureSpecificRuntimeGlob, /x64/u);
});

test("universal merge uses one architecture-independent renderer tree", async t => {
  const directory = await mkdtemp(join(tmpdir(), "opencraft-universal-renderer-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const x64App = join(directory, "x64/OpenCraft.app");
  const arm64App = join(directory, "arm64/OpenCraft.app");
  const x64Renderer = join(x64App, "Contents/Resources/renderer");
  const arm64Renderer = join(arm64App, "Contents/Resources/renderer");
  await Promise.all([
    mkdir(join(x64Renderer, "assets"), { recursive: true }),
    mkdir(join(arm64Renderer, "assets"), { recursive: true }),
  ]);
  await writeFile(join(x64Renderer, "assets/app-x64-hash.js"), "shared renderer");
  await writeFile(join(arm64Renderer, "assets/app-arm64-hash.js"), "shared renderer");

  await synchronizeRendererFiles(x64App, arm64App);

  assert.equal(
    await readFile(join(arm64Renderer, "assets/app-x64-hash.js"), "utf8"),
    "shared renderer",
  );
  await assert.rejects(readFile(join(arm64Renderer, "assets/app-arm64-hash.js")), /ENOENT/u);
});

test("macOS release workflow isolates signing secrets from native build jobs", async () => {
  const workflow = await readFile(new URL("../.github/workflows/macos-universal-release.yml", import.meta.url), "utf8");
  assert.match(workflow, /runs-on: macos-15\n/u);
  assert.match(workflow, /runs-on: macos-15-intel/u);
  assert.match(workflow, /environment: macos-release/u);
  assert.match(workflow, /MACOS_CERTIFICATE_P12_BASE64/u);
  assert.match(workflow, /APPLE_APP_SPECIFIC_PASSWORD/u);
  assert.doesNotMatch(workflow, /APPLE_API_KEY_P8/u);
  assert.match(workflow, /merge-macos-universal\.mjs/u);
  assert.match(workflow, /sign-notarize-macos\.mjs/u);
  assert.match(workflow, /builder_identity="\$\{CSC_NAME#Developer ID Application: \}"/u);
  assert.match(workflow, /--config\.mac\.identity="\$builder_identity"/u);
  assert.match(workflow, /publish:\n/u);
  assert.match(workflow, /permissions:\n      contents: write/u);
});

test("signing fails before filesystem or Apple access when credentials are absent", async () => {
  await assert.rejects(signAndNotarizeMacos("missing.app", {}), /CSC_NAME/u);
});

test("final DMG notarization requires Apple's acceptance before stapling", async t => {
  const directory = await mkdtemp(join(tmpdir(), "opencraft-dmg-notary-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dmg = join(directory, "OpenCraft.dmg");
  await writeFile(dmg, "signed DMG fixture");
  const environment = {
    APPLE_ID: "test@example.invalid",
    APPLE_APP_SPECIFIC_PASSWORD: "test-password",
    APPLE_TEAM_ID: "TESTTEAMID",
  };
  const calls = [];
  const run = async args => {
    calls.push(args);
    return { stdout: JSON.stringify({ status: "Accepted", id: "test-request" }) };
  };
  assert.equal(await notarizeMacosDmg(dmg, environment, run), dmg);
  assert.equal(calls[0][0], "notarytool");
  assert.ok(calls[0].includes("--wait"));
  assert.deepEqual(calls.slice(1), [["stapler", "staple", dmg], ["stapler", "validate", dmg]]);

  let attempts = 0;
  await assert.rejects(notarizeMacosDmg(dmg, environment, async () => {
    attempts++;
    return { stdout: JSON.stringify({ status: "Invalid", id: "rejected-request" }) };
  }), /not accepted/u);
  assert.equal(attempts, 1);
  await assert.rejects(notarizeMacosDmg("missing.dmg", {}), /APPLE_ID/u);
});

test("release checks credentials before native builds and verifies the final DMG ticket before upload", async () => {
  const workflow = await readFile(new URL("../.github/workflows/macos-universal-release.yml", import.meta.url), "utf8");
  assert.match(workflow, /arm64:\n    needs: credentials/u);
  assert.match(workflow, /x64:\n    needs: credentials/u);
  assert.ok(workflow.indexOf("notarize-macos-dmg.mjs") < workflow.indexOf('xcrun stapler validate "$dmg"'));
  assert.ok(workflow.indexOf('xcrun stapler validate "$dmg"') < workflow.indexOf('shasum -a 256 "$dmg"'));
});
