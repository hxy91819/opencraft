import { groupWorkInMachines, workInMachineName, type WorkInMachine } from "@opencraft/workbench-runtime";
import type { useIntl } from "@opencraft/i18n/react";
export { groupWorkInMachines };
export function machineName(machine: WorkInMachine, platform: "web" | "electron", intl: ReturnType<typeof useIntl>) {
  return workInMachineName(machine, platform, {
    thisMac: intl.formatMessage({ id: "workIn.thisMac", defaultMessage: "This Mac" }),
    thisComputer: intl.formatMessage({ id: "workIn.thisComputer", defaultMessage: "This computer" }),
    unknown: intl.formatMessage({ id: "workIn.unknown", defaultMessage: "Unknown machine" }),
  });
}

export function machineRole(machine: WorkInMachine, platform: "web" | "electron"): "local" | "server" | "cloud" {
  if (machine.cloud) return "cloud";
  return platform === "electron" && machine.hosts.some(host => host.providerId === "vela.builtin-agents") ? "local" : "server";
}
