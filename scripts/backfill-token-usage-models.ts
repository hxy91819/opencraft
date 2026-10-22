import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { OpenCraftHostStateDatabase } from "../apps/opencraft-daemon/src/opencraft-host-state-database.js";
import { OpenCraftTokenUsageLedger } from "../apps/opencraft-daemon/src/token-usage-ledger.js";
import { backfillTokenUsageModels } from "../apps/opencraft-daemon/src/token-usage-model-backfill.js";

const { values } = parseArgs({
  options: {
    "data-dir": { type: "string" },
    "server-id": { type: "string" },
    "apply": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const dataDir = resolve(values["data-dir"] ?? process.env.OPENCRAFT_CODEX_DATA_DIR ?? "/data/opencraft-join/data/codex");
const serverId = values["server-id"] ?? process.env.OPENCRAFT_SERVER_ID ?? "server:21b6b553-92d1-460d-baf1-956779315d55:codex";
const apply = values.apply === true && values["dry-run"] !== true;

console.log(`Starting token usage model backfill (data-dir=${dataDir}, server-id=${serverId}, mode=${apply ? "APPLY" : "DRY-RUN"})...`);

const state = new OpenCraftHostStateDatabase(dataDir);
try {
  const ledger = new OpenCraftTokenUsageLedger(state, serverId);
  const result = await backfillTokenUsageModels({ state, ledger, apply });
  console.log(JSON.stringify({ passed: true, apply, ...result }, null, 2));
} finally {
  state.close();
}
