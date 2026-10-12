import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { groupWorkInMachines, type HostConnectionProfile, type EnvironmentEntry } from "@opencraft/workbench-runtime";
import messages from "../apps/workbench-web/src/i18n/locales/zh-CN.json";

const identity = { machineId: "12345678-1234-4123-8123-123456789abc", name: "我的服务器", platform: "linux" as const };
function profile(hostId: string, agent: string): HostConnectionProfile {
  return { hostId, agent, machineIdentity: identity, displayName: hostId, providerId: "vela.builtin-agents", providerConfig: { url: `ws://server/${hostId}?token=secret` }, providerConfigVersion: 1, hostKind: "local", enabled: true, autoConnect: false, includeInSidebar: true, credentialRef: null, transportEndpoint: null, executionLocation: null, workspaceBrowseRoots: [], revision: 0 };
}

test("machine list/detail render grouped Agents, scoped settings, individual connections, cloud lifecycle and desktop names", async context => {
  const directory = await mkdtemp(join(process.cwd(), "node_modules/.settings-machines-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const bundle = join(directory, "page.cjs");
  await build({
    stdin: { contents: 'export * from "./apps/workbench-web/src/components/settings-machines";', resolveDir: process.cwd(), loader: "ts" },
    outfile: bundle, bundle: true, platform: "node", format: "cjs", jsx: "automatic",
    external: ["react", "react/*", "react-dom", "react-dom/*", "react-intl"],
    loader: { ".scss": "empty", ".css": "empty", ".svg": "dataurl" },
    plugins: [{ name: "runtime-boundary", setup(builder) {
      builder.onResolve({ filter: /appserver-runtime-context$/ }, () => ({ path: "runtime", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: 'export const useMachineConnectionPhase = () => "ready"; export const useHostConnectionPhase = id => id === "local-codex" ? "error" : "ready";', loader: "js" }));
    }}], logLevel: "silent",
  });
  const { SettingsMachines, SettingsMachine, MachineConnectionsAvailable } = createRequire(import.meta.url)(bundle);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { href: "http://fixture.test" } } });
  context.after(() => previous ? Object.defineProperty(globalThis, "window", previous) : Reflect.deleteProperty(globalThis, "window"));
  const hosts = [profile("local", "OpenCraft"), profile("local-codex", "Codex"), profile("alias", "OpenCraft")];
  const unknown = { ...profile("unknown", "Hermes"), machineIdentity: null };
  const cloud = { ...profile("cloud", "Hermes"), displayName: "云环境", enabled: false };
  const entry: EnvironmentEntry = { id: "cloud", sourceId: "lightvela", name: "云环境", location: "region", profile: cloud, connectable: true,
    resource: { providerId: "lightvela", phase: "suspended", rawPhase: "stopped", message: null, capabilities: { suspend: false, resume: true, remove: true } } };
  const machines = groupWorkInMachines([...hosts, unknown, cloud], [entry]);
  const render = (component: React.ReactNode) => renderToStaticMarkup(<IntlProvider locale="zh-CN" defaultLocale="en" messages={messages}>{component}</IntlProvider>);
  const onSectionChange = () => { throw new Error("render must be read-only"); };
  const list = render(<SettingsMachines machines={machines} platform="web" onSectionChange={onSectionChange} />);
  assert.equal((list.match(/settings-control-list-item"/g) ?? []).length, 3);
  assert.match(list, /我的服务器/); assert.match(list, /未知机器 · unknown/); assert.match(list, /云端 · LightVela/); assert.match(list, /已暂停/);
  const pages = [
    { id: "model", title: "模型服务", targetHostId: "local", viewId: "model-view" },
    { id: "codex", title: "Codex 账户", targetHostId: "local-codex", viewId: "codex-view" },
    { id: "other", title: "其他机器设置", targetHostId: "unknown", viewId: "other-view" },
  ];
  const detail = render(<SettingsMachine machine={machines[0]} pages={pages} platform="web" onSectionChange={onSectionChange} />);
  assert.match(detail, /Linux · 服务端/); assert.match(detail, /模型服务/); assert.match(detail, /Codex 账户/);
  assert.doesNotMatch(detail, /其他机器设置|secret|项目|这台/);
  assert.equal((detail.match(/settings-control-row__label">OpenCraft/g) ?? []).length, 3, "one Agent row and two connection rows");
  assert.match(detail, /ws:\/\/server\/local-codex/); assert.match(detail, /连接失败/);
  const desktop = render(<SettingsMachine machine={machines[0]} pages={pages} platform="electron" onSectionChange={onSectionChange} />);
  assert.match(desktop, /这台电脑/);
  const mac = { ...machines[0], identity: { ...identity, platform: "macos" } };
  assert.match(render(<SettingsMachine machine={mac} pages={pages} platform="electron" onSectionChange={onSectionChange} />), /这台 Mac/);
  const empty = render(<SettingsMachines machines={[]} platform="web" onSectionChange={onSectionChange} />);
  assert.match(empty, /暂无机器/);
  const hostless = render(<MachineConnectionsAvailable.Provider value={false}><SettingsMachine machine={machines[2]} pages={[]} platform="web" onSectionChange={onSectionChange} /></MachineConnectionsAvailable.Provider>);
  assert.match(hostless, /未连接/); assert.match(hostless, /已暂停/); assert.doesNotMatch(hostless, /已连接/);
});
