#!/usr/bin/env node
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createWorkbenchWebServer } from "./workbench-web-server.mjs";
export { createWorkbenchWebServer } from "./workbench-web-server.mjs";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseNumber(value, fallback) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return parsed;
}

const isMain = process.argv[1] != null
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  void (async () => {
    const host = process.env.OPENCRAFT_WEB_HOST || "0.0.0.0";
    const port = parseNumber(process.env.OPENCRAFT_WEB_PORT, 10000);
    const webServer = await createWorkbenchWebServer({
      root: process.env.OPENCRAFT_WEB_ROOT || join(repositoryRoot, "apps/workbench-web/dist"),
      appServerTarget: process.env.OPENCRAFT_APPSERVER_URL || "ws://127.0.0.1:9988/rpc",
      hyperNodeUser: process.env.OPENCRAFT_HYPERNODE_USER?.trim() || "",
    });
    const address = await webServer.listen({ host, port });
    console.log(`[opencraft static] ${webServer.staticRoot} -> http://${host}:${address.port}`);
    console.log(`[opencraft appserver] /appserver -> ${webServer.appServerTarget}`);

    const shutdown = async () => {
      await webServer.close();
      process.exit(0);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  })().catch((error) => {
    console.error("[opencraft static] failed to start", error);
    process.exitCode = 1;
  });
}
