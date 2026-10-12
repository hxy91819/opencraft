import type { TrustedExtensionDefinition } from "@opencraft/extension-runtime";

export const LightVelaCollaborationManifest = {
  manifestVersion: 1,
  id: "lightvela.collaboration",
  name: "LightVela Collaboration",
  description: "团队频道、成员目录与私聊。需要登录 LightVela 并加入协作空间。",
  version: "0.1.0",
  apiVersion: 1,
  trust: "trusted",
  platforms: ["web"],
  activationEvents: ["onStartupFinished"],
  dependencies: ["lightvela.platform"],
} satisfies TrustedExtensionDefinition["manifest"];
