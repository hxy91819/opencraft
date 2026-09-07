import type { TrustedExtensionDefinition } from "@opencraft/extension-runtime";

import { LightVelaAccountService, type LightVelaAccountServiceOptions } from "./account/lightvela-account-service";
import { createLightVelaHermesHostProvider } from "./host/lightvela-hermes-host-provider";
import { createLightVelaHermesSettingsView } from "./settings/lightvela-hermes-settings-view";
import { createLightVelaHermesEmptyView } from "./settings/lightvela-hermes-empty-view";

export function createLightVelaHermesExtension(
  options: LightVelaAccountServiceOptions = {},
): TrustedExtensionDefinition {
  const account = new LightVelaAccountService(options);
  const SettingsView = createLightVelaHermesSettingsView(account);
  const EmptyView = createLightVelaHermesEmptyView(account);
  return {
    manifest: {
      manifestVersion: 1,
      id: "lightvela.hermes",
      name: "LightVela Hermes",
      description: "Connects a LightVela Bot's Hermes runtime as a OpenCraft Host.",
      version: "0.1.0",
      apiVersion: 1,
      trust: "trusted",
      platforms: ["web", "electron"],
      activationEvents: ["onStartupFinished"],
    },
    activate(api) {
      api.views.register({
        id: "lightvela.hermes.settings-view",
        title: "LightVela",
        viewType: "lightvela.hermes.settings",
        icon: "server",
        platforms: ["web", "electron"],
      });
      api.views.register({
        id: "lightvela.hermes.empty-view",
        title: "LightVela",
        viewType: "lightvela.hermes.empty-workbench",
        icon: "server",
        platforms: ["web", "electron"],
      });
      api.settings.registerPage({
        id: "lightvela.hermes.settings",
        title: "LightVela",
        viewId: "lightvela.hermes.settings-view",
        icon: "server",
        order: 300,
        platforms: ["web", "electron"],
      });
      api.workbench.registerSurface({
        id: "lightvela.hermes.empty-workbench",
        viewId: "lightvela.hermes.empty-view",
        surface: "empty-workbench",
        order: 100,
        platforms: ["web", "electron"],
      });
      api.internal.register("platformViewRenderer", {
        viewType: "lightvela.hermes.settings",
        Component: SettingsView,
      });
      api.internal.register("platformViewRenderer", {
        viewType: "lightvela.hermes.empty-workbench",
        Component: EmptyView,
      });
      api.internal.register("hostConnectionProvider", createLightVelaHermesHostProvider(account));
      api.subscriptions.add(() => account.dispose());
    },
  };
}
