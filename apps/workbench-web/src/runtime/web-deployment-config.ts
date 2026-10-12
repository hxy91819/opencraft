// Website-owned data, injected before the application module starts. Electron
// never reads this contract; a static/Vite deployment has no injected element.
import { createWorkbenchDraftLocation, createWorkbenchThreadLocation, type WorkbenchLocation } from "@opencraft/workbench-runtime";

export interface WebDeploymentConfig {
  readonly hosts: readonly unknown[];
  readonly builtinAgents: boolean;
  readonly hypernode: boolean;
}

export function resolveLegacyWebsiteLocation(location: WorkbenchLocation | null): WorkbenchLocation | null {
  if (location === null) return null;
  if (location.kind === "thread") return location.key.hostId === "hypernode"
    ? createWorkbenchThreadLocation("local", location.key.threadId) : location;
  return location.hostId === "hypernode" ? createWorkbenchDraftLocation("local", location.draftId) : location;
}

/** Additive migration of the legacy Web selection authority, never overwrite local intent. */
export function restoreLegacyWebsiteSelection(storage: Storage) {
  for (const prefix of ["vela.active-thread-id:", "vela.selected-project-id:"]) {
    const old = storage.getItem(`${prefix}hypernode`);
    if (old !== null && storage.getItem(`${prefix}local`) === null) storage.setItem(`${prefix}local`, old);
  }
  if (storage.getItem("vela.active-host-id") === "hypernode") storage.setItem("vela.active-host-id", "local");
}

export function parseWebDeploymentConfig(raw: string | null): WebDeploymentConfig | null {
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid website deployment configuration");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.hosts) || typeof record.builtinAgents !== "boolean"
    || typeof record.hypernode !== "boolean") {
    throw new Error("Invalid website deployment configuration");
  }
  return { hosts: record.hosts, builtinAgents: record.builtinAgents, hypernode: record.hypernode };
}

export function resolveWebDeploymentConfig(
  runtime: WebDeploymentConfig | null,
  build: { readonly hosts?: string; readonly builtinAgents?: string; readonly hypernode?: string },
) {
  return {
    hosts: build.hosts?.trim() ? build.hosts
      : runtime && runtime.hosts.length > 0 ? JSON.stringify(runtime.hosts) : undefined,
    builtinAgents: build.builtinAgents === "enabled" ? true
      : build.builtinAgents === "disabled" ? false : runtime?.builtinAgents ?? false,
    hypernode: build.hypernode === "disabled" ? false
      : build.hypernode === "enabled" ? true : runtime?.hypernode ?? true,
  };
}
