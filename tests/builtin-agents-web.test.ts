import assert from "node:assert/strict";
import test from "node:test";

import { ExtensionSupervisor } from "@opencraft/extension-runtime";
import { HOST_PROFILE_CONTRIBUTION_CHANNEL } from "@opencraft/workbench-runtime";
import { createBuiltinAgentsExtension } from "../plugins/builtin-agents/src/index";

test("Web can activate built-in model and Codex settings without desktop Host registration", async () => {
  const renderedViews: string[] = [];
  const supervisor = new ExtensionSupervisor({
    platform: "web",
    internalContributions: {
      platformViewRenderer: {
        prepare(_owner, value) {
          const view = value as { readonly viewType: string };
          return {
            commit() {
              renderedViews.push(view.viewType);
              return () => undefined;
            },
          };
        },
      },
    },
  });
  try {
    await supervisor.activate(createBuiltinAgentsExtension({
      platform: "web",
      requestHost: async () => { throw new Error("Host request is unnecessary for registration"); },
    }));
    const pages = supervisor.contributions.getSnapshot().settingsPages.map(({ contribution }) => contribution);
    assert.deepEqual(pages.map(({ id }) => id).sort(), [
      "vela.builtin-agents.codex-accounts",
      "vela.builtin-agents.model-services",
    ]);
    assert.ok(pages.every(({ platforms }) => platforms?.includes("web")));
    assert.ok(pages.every(({ group }) => group === "服务器"));
    assert.deepEqual(renderedViews.sort(), [
      "vela.builtin-agents.codex-accounts",
      "vela.builtin-agents.model-services",
    ]);
  } finally {
    await supervisor.dispose();
  }
});

test("Electron retains daemon Host registration and local settings grouping", async () => {
  const providerIds: string[] = [];
  const hostIds: string[] = [];
  const supervisor = new ExtensionSupervisor({
    platform: "electron",
    internalContributions: {
      platformViewRenderer: { prepare() { return { commit: () => () => undefined }; } },
      hostConnectionProvider: {
        prepare(_owner, value) {
          const provider = value as { readonly id: string };
          return { commit() { providerIds.push(provider.id); return () => undefined; } };
        },
      },
      [HOST_PROFILE_CONTRIBUTION_CHANNEL]: {
        prepare(_owner, value) {
          const contribution = value as { readonly profile: { readonly hostId: string } };
          return { commit() { hostIds.push(contribution.profile.hostId); return () => undefined; } };
        },
      },
    },
  });
  try {
    await supervisor.activate(createBuiltinAgentsExtension({
      requestHost: async () => { throw new Error("Host request is unnecessary for registration"); },
      createTransport: () => { throw new Error("Transport is unnecessary for registration"); },
    }));
    const pages = supervisor.contributions.getSnapshot().settingsPages.map(({ contribution }) => contribution);
    assert.equal(pages.length, 2);
    assert.ok(pages.every(({ group, platforms }) => group === "本机" && platforms?.includes("electron")));
    assert.deepEqual(providerIds, ["vela.builtin-agents"]);
    assert.deepEqual(hostIds.sort(), ["local", "local-codex"]);
  } finally {
    await supervisor.dispose();
  }
});
