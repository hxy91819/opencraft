import type {
  HostConnectionJson,
  HostConnectionProvider,
} from "@opencraft/workbench-runtime";

import type { LightVelaAccountService } from "../account/lightvela-account-service";
import { LightVelaHermesTransport } from "../transport/lightvela-hermes-transport";

export interface LightVelaHermesHostConfig {
  readonly dashboardUrl?: string;
}

function validateConfig(config: HostConnectionJson): LightVelaHermesHostConfig & HostConnectionJson {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new TypeError("LightVela Hermes Host config must be an object");
  }
  const record = config as Readonly<Record<string, HostConnectionJson>>;
  if (record.dashboardUrl !== undefined && typeof record.dashboardUrl !== "string") {
    throw new TypeError("LightVela Hermes dashboard URL must be a string");
  }
  return Object.freeze({
    ...(typeof record.dashboardUrl === "string" && record.dashboardUrl.trim()
      ? { dashboardUrl: record.dashboardUrl.trim() }
      : {}),
  }) as LightVelaHermesHostConfig & HostConnectionJson;
}

export function createLightVelaHermesHostProvider(
  account: LightVelaAccountService,
): HostConnectionProvider {
  return {
    id: "lightvela.hermes",
    label: "LightVela Hermes",
    targets: ["web", "electron"],
    configVersion: 1,
    validate: validateConfig,
    createTransport(config) {
      const normalized = validateConfig(config);
      return new LightVelaHermesTransport({
        account,
        dashboardUrl: normalized.dashboardUrl,
      });
    },
  };
}
