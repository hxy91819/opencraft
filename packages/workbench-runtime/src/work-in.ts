import { parseRuntimeMachineReadResponse, type RuntimeMachineReadResponse, type RuntimeMachineIdentity } from "@opencraft/appserver-protocol";
import type { HostConnectionProfile } from "./host-connections";
import type { EnvironmentEntry } from "./environment-directory/contract";

export interface WorkInMachine {
  readonly id: string;
  readonly identity: RuntimeMachineIdentity | null;
  readonly hosts: readonly HostConnectionProfile[];
  readonly resource: EnvironmentEntry["resource"];
  readonly cloud: boolean;
}

/** Reported identity only. Endpoint, kind and names never establish equality. */
export function groupWorkInMachines(profiles: readonly HostConnectionProfile[], entries: readonly EnvironmentEntry[] = []): readonly WorkInMachine[] {
  const groups = new Map<string, { id: string; identity: RuntimeMachineIdentity | null; hosts: HostConnectionProfile[]; resource: EnvironmentEntry["resource"]; cloud: boolean }>();
  for (const host of profiles) {
    const resource = entries.find(entry => entry.profile.hostId === host.hostId)?.resource ?? null;
    if (!host.enabled && resource === null) continue;
    const identity = resource === null ? host.machineIdentity ?? null : null;
    const id = resource !== null ? `cloud:${host.hostId}` : identity === null ? `host:${host.hostId}` : `machine:${identity.machineId}`;
    const group = groups.get(id);
    if (group) group.hosts.push(host);
    else groups.set(id, { id, identity, hosts: [host], resource, cloud: resource !== null });
  }
  return [...groups.values()];
}

export function workInMachineName(machine: WorkInMachine, platform: "web" | "electron" | "expo", labels: { thisMac: string; thisComputer: string; unknown: string }): string {
  // Only the desktop's builtin daemon provider identifies this device.
  if (machine.identity !== null && platform === "electron" && machine.hosts.some(host => host.providerId === "vela.builtin-agents")) {
    return machine.identity?.platform === "macos" ? labels.thisMac : labels.thisComputer;
  }
  return machine.identity?.name ?? (machine.cloud ? machine.hosts[0]!.displayName : `${labels.unknown} · ${machine.hosts[0]!.displayName}`);
}

export function sameWorkInMachine(a: HostConnectionProfile | undefined, b: HostConnectionProfile | undefined, entries: readonly EnvironmentEntry[] = []): boolean {
  if (a?.hostId !== b?.hostId && entries.some(entry => entry.resource !== null && (entry.profile.hostId === a?.hostId || entry.profile.hostId === b?.hostId))) return false;
  return a !== undefined && b !== undefined && (a.hostId === b.hostId || (a.machineIdentity != null && b.machineIdentity != null && a.machineIdentity.machineId === b.machineIdentity.machineId));
}

/** Unsupported/old Hosts remain usable. A failed read has no machine authority. */
export async function readHostMachineInfo(request: () => Promise<unknown>): Promise<RuntimeMachineReadResponse | null> {
  try { return parseRuntimeMachineReadResponse(await request()); } catch { return null; }
}

export function chooseWorkInHost(machine: WorkInMachine, currentAgent: HostConnectionProfile["agent"], currentHostId?: string): HostConnectionProfile {
  const current = machine.hosts.find(host => host.hostId === currentHostId);
  if (current) return current;
  return machine.hosts.find(host => currentAgent != null && host.agent === currentAgent) ?? machine.hosts[0]!;
}

/** Multiple connection profiles may expose one reported Agent. Prefer the current path; the active Agent comes first. */
export function workInAgentHosts(machine: WorkInMachine | undefined, activeHostId: string): readonly HostConnectionProfile[] {
  const agents = new Map<string, HostConnectionProfile>();
  for (const host of machine?.hosts ?? []) {
    if (!host.enabled) continue;
    const key = host.agent ?? `host:${host.hostId}`;
    if (!agents.has(key) || host.hostId === activeHostId) agents.set(key, host);
  }
  const result = [...agents.values()];
  const activeIndex = result.findIndex(host => host.hostId === activeHostId);
  if (activeIndex > 0) {
    const [active] = result.splice(activeIndex, 1);
    result.unshift(active!);
  }
  return result;
}
