import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { asHostId } from "@opencraft/chat-core";
import { createComposerController } from "@opencraft/composer-core";
import { createConversationScopeRegistry } from "@opencraft/workbench-runtime";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";

test("new task presents machine, decorative separator, project, then branch in DOM order", async (context) => {
  const directory = await mkdtemp(join(process.cwd(), "node_modules/.chip-order-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const bundle = join(directory, "page.cjs");
  // Render the real page and Composer. The Shell's DOM reparenting is a browser boundary.
  await build({
    stdin: {
      contents: 'export { NewThreadDraftPage } from "./apps/workbench-web/src/components/new-thread-draft-page";',
      resolveDir: process.cwd(),
      loader: "ts",
    },
    outfile: bundle,
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["react", "react/*", "react-dom", "react-dom/*", "react-intl"],
    loader: { ".scss": "empty", ".css": "empty", ".svg": "dataurl" },
    plugins: [{
      name: "inline-shell-presentation",
      setup(builder) {
        builder.onResolve({ filter: /thread-composer-presentation$/ }, () => ({ path: "inline-shell", namespace: "test" }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: "export function ThreadComposerPresentation({ children }) { return children; }",
          loader: "js",
        }));
      },
    }],
    logLevel: "silent",
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  context.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  const { NewThreadDraftPage } = createRequire(import.meta.url)(bundle) as typeof import("../apps/workbench-web/src/components/new-thread-draft-page");
  const scopes = createConversationScopeRegistry({ initialDraft: {
    draftId: "chip-order",
    execution: { hostId: asHostId("local"), workspace: { cwd: "/project", runtimeWorkspaceRoots: ["/project"], projectId: "project" } },
  } });
  const draft = scopes.getActiveDraft()!;
  const controller = createComposerController(draft.target, { now: Date.now, createId: () => "chip-order" });
  try {
    const markup = renderToStaticMarkup(
      <IntlProvider locale="en" defaultLocale="en">
          <NewThreadDraftPage draft={draft} controller={controller} composerPresentationEnabled={false}
            catalog={{ search: async () => [] }}
            selectionCatalog={{ agents: [], models: [], permissionProfiles: [] }}
            workspaceOptions={[{ projectId: "project", cwd: "/project", label: "Project", rootLabel: "Project", runtimeWorkspaceRoots: ["/project"], branch: "main" }]}
            activeHostId="local" hostOptions={[{ id: "local", hostIds: ["local"], label: "Machine", platform: "linux", role: "server", resource: null, cloud: false, connectable: true }]}
            connectionPhase="ready" onSelectHost={() => {}} onSelectWorkspace={() => {}}
            onBrowseWorkspace={() => {}} onSubmit={() => false} />
      </IntlProvider>,
    );
    const machine = markup.indexOf('aria-label="Work in"');
    const separator = markup.indexOf('new-thread-context-separator');
    const project = markup.indexOf('aria-label="Choose project folder"');
    const branch = markup.indexOf('title="Git branch: main"');
    assert.ok(machine >= 0 && machine < separator && separator < project && project < branch);
    const separatorSvg = markup.match(/<svg\b[^>]*class="[^"]*new-thread-context-separator[^>]*>/)?.[0];
    assert.ok(separatorSvg);
    assert.match(separatorSvg, /aria-hidden="true"/);
    assert.match(separatorSvg, /focusable="false"/);
    assert.doesNotMatch(separatorSvg, /tabindex/i);
  } finally {
    scopes.dispose();
  }
});
