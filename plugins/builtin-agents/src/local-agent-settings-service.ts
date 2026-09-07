import type {
  AppServerMethod, AppServerMethodParams, AppServerMethodResult, RuntimeCredentialView,
  RuntimeDiscoveredModelView, RuntimeModelsListResponse, RuntimeProviderView,
  RuntimeProvidersListResponse, RuntimeSettingsDescribeResponse, RuntimeSettingsNamespaceView,
  RuntimeStatusResponse,
} from "@opencraft/appserver-protocol";

export type HostProtocolRequest = <TMethod extends AppServerMethod>(hostId: string, method: TMethod,
  params: AppServerMethodParams<TMethod>) => Promise<AppServerMethodResult<TMethod>>;

export interface LocalAgentSettingsSnapshot {
  readonly phase: "idle" | "loading" | "ready" | "error";
  readonly status: RuntimeStatusResponse | null;
  readonly settings: RuntimeSettingsDescribeResponse | null;
  readonly providers: RuntimeProvidersListResponse | null;
  readonly models: RuntimeModelsListResponse | null;
  readonly error: string | null;
}

export interface RuntimeProviderConfiguration { readonly baseURL: string; readonly credentialRef: string }
export interface SaveRuntimeProviderInput extends RuntimeProviderConfiguration { readonly apiKey: string }

const EMPTY_SNAPSHOT: LocalAgentSettingsSnapshot = Object.freeze({
  phase: "idle", status: null, settings: null, providers: null, models: null, error: null,
});

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
function atPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) current = record(current)[segment];
  return current;
}
function defaultCredentialRef(provider: string): string {
  return `${provider.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase()}_API_KEY`;
}

export class LocalAgentSettingsService {
  private snapshot: LocalAgentSettingsSnapshot = EMPTY_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private refreshGeneration = 0;
  private disposed = false;
  constructor(private readonly requestHost: HostProtocolRequest) {}

  getSnapshot = (): LocalAgentSettingsSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  };

  async refresh(): Promise<void> {
    const generation = ++this.refreshGeneration;
    this.publish({ ...this.snapshot, phase: "loading", error: null });
    try {
      const [status, settings, providers, models] = await Promise.all([
        this.requestHost("local", "runtime/status/read", {}),
        this.requestHost("local", "runtime/settings/describe", {}),
        this.requestHost("local", "runtime/providers/list", {}),
        this.requestHost("local", "runtime/models/list", {}),
      ]);
      if (this.disposed || generation !== this.refreshGeneration) return;
      this.publish({ phase: "ready", status, settings, providers, models, error: null });
    } catch (error) {
      if (this.disposed || generation !== this.refreshGeneration) return;
      this.publish({ ...this.snapshot, phase: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  providerConfiguration(provider: RuntimeProviderView): RuntimeProviderConfiguration {
    const namespace = this.snapshot.settings?.namespaces.find((entry) => entry.ns === provider.settingsNs);
    const profile = record(atPath(namespace?.value, provider.settingsPath));
    return {
      baseURL: typeof profile.baseURL === "string" ? profile.baseURL : "",
      credentialRef: typeof profile.apiKeyEnv === "string" && profile.apiKeyEnv.trim() !== ""
        ? profile.apiKeyEnv.trim() : defaultCredentialRef(provider.provider),
    };
  }

  async describeCredential(ref: string): Promise<RuntimeCredentialView | null> {
    if (ref.trim() === "") return null;
    const result = await this.requestHost("local", "runtime/credentials/describe", { refs: [ref.trim()] });
    return result.credentials[ref.trim()] ?? null;
  }

  async discoverModels(provider: RuntimeProviderView, input: SaveRuntimeProviderInput): Promise<readonly RuntimeDiscoveredModelView[]> {
    const result = await this.requestHost("local", "runtime/models/discover", {
      settingsNs: provider.settingsNs,
      provider: provider.provider,
      ...(input.baseURL.trim() === "" ? {} : { baseURL: input.baseURL.trim() }),
      ...(input.apiKey.trim() === "" ? {} : { apiKey: input.apiKey.trim() }),
    });
    return result.models;
  }

  async saveDefaultModel(provider: string, model: string, reasoningEffort: string): Promise<void> {
    const namespace = this.namespace("agent-default-model");
    await this.requestHost("local", "runtime/settings/mutate", { ns: namespace.ns, expectedRevision: namespace.revision, ops: [
      { op: "set", path: ["provider"], value: provider }, { op: "set", path: ["model"], value: model },
      { op: "set", path: ["reasoningEffort"], value: reasoningEffort },
    ] });
    await this.refresh();
  }

  async saveProvider(provider: RuntimeProviderView, input: SaveRuntimeProviderInput): Promise<void> {
    const namespace = this.namespace(provider.settingsNs);
    const current = record(atPath(namespace.value, provider.settingsPath));
    const baseURL = input.baseURL.trim();
    const credentialRef = input.credentialRef.trim();
    const next: Record<string, unknown> = { ...current };
    if (baseURL === "") delete next.baseURL; else next.baseURL = baseURL;
    if (credentialRef === "") delete next.apiKeyEnv; else next.apiKeyEnv = credentialRef;
    if (input.apiKey.trim() !== "") {
      if (credentialRef === "") throw new Error("Choose a credential reference before saving an API key");
      await this.requestHost("local", "runtime/credentials/set", { ref: credentialRef, value: input.apiKey.trim() });
    }
    await this.requestHost("local", "runtime/settings/mutate", {
      ns: namespace.ns, expectedRevision: namespace.revision,
      ops: [{ op: "set", path: provider.settingsPath, value: next }],
    });
    await this.refresh();
  }

  async disableProvider(provider: RuntimeProviderView): Promise<void> {
    if (provider.settingsPath.length === 0) throw new Error(`${provider.displayName} is part of the runtime composition and cannot be disabled`);
    const namespace = this.namespace(provider.settingsNs);
    await this.requestHost("local", "runtime/settings/mutate", {
      ns: namespace.ns, expectedRevision: namespace.revision,
      ops: [{ op: "unset", path: provider.settingsPath }],
    });
    await this.refresh();
  }

  async clearCredential(ref: string): Promise<void> {
    await this.requestHost("local", "runtime/credentials/unset", { ref: ref.trim() });
    await this.refresh();
  }
  dispose(): void { this.disposed = true; this.refreshGeneration += 1; this.listeners.clear(); }
  private namespace(ns: string): RuntimeSettingsNamespaceView {
    const namespace = this.snapshot.settings?.namespaces.find((candidate) => candidate.ns === ns);
    if (!namespace) throw new Error(`Local Agent does not expose the ${ns} settings namespace`);
    if (this.snapshot.settings?.writable !== true) throw new Error("Local Agent settings are read-only");
    return namespace;
  }
  private publish(snapshot: LocalAgentSettingsSnapshot): void {
    this.snapshot = Object.freeze(snapshot); for (const listener of this.listeners) listener();
  }
}
