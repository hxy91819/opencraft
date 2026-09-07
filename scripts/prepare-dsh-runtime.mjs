#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtime = resolve(root, "runtime/dsh");
const version = "0.1.1-rc.2";
await mkdir(runtime, { recursive: true });
const marker = resolve(runtime, ".opencraft-dsh-version");
let current = "";
try { current = (await readFile(marker, "utf8")).trim(); } catch { /* first preparation */ }
const executable = resolve(runtime, "node_modules/@deepseek-ai/dsh/lib/bin.js");
let hasExecutable = true;
try { await readFile(executable); } catch { hasExecutable = false; }
if (current !== version || !hasExecutable) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
      cwd: runtime,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`npm install exited ${code}`)));
  });
  await writeFile(marker, `${version}\n`, "utf8");
}
console.log(`[opencraft] DSH runtime ${version} ready at ${runtime}`);
