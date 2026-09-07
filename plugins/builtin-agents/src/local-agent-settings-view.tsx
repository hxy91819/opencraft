import { Bot, KeyRound, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { RuntimeCredentialView, RuntimeDiscoveredModelView, RuntimeProviderView } from "@opencraft/appserver-protocol";
import {
  SettingsActions,
  SettingsButton,
  SettingsGroup,
  SettingsListItem,
  SettingsNotice,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsTextInput,
  type ExtensionSettingsViewProps,
} from "@opencraft/extension-react";
import type { LocalAgentSettingsService, SaveRuntimeProviderInput } from "./local-agent-settings-service";

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const OAUTH_ONLY_PROVIDERS = new Set(["openai-codex"]);

export function createLocalAgentSettingsView(service: LocalAgentSettingsService) {
  return function LocalAgentSettingsView(_props: ExtensionSettingsViewProps) {
    const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);
    const defaultNamespace = snapshot.settings?.namespaces.find((entry) => entry.ns === "agent-default-model") ?? null;
    const defaults = record(defaultNamespace?.value);
    const [provider, setProvider] = useState("");
    const [model, setModel] = useState("");
    const [effort, setEffort] = useState("");
    const [editorProviderId, setEditorProviderId] = useState("deepseek");
    const [baseURL, setBaseURL] = useState("");
    const [credentialRef, setCredentialRef] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [credential, setCredential] = useState<RuntimeCredentialView | null>(null);
    const [discovered, setDiscovered] = useState<readonly RuntimeDiscoveredModelView[] | null>(null);
    const [saving, setSaving] = useState<"model" | "provider" | "credential" | "discover" | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => { void service.refresh(); }, []);
    useEffect(() => {
      if (snapshot.phase !== "ready") return;
      setProvider(typeof defaults.provider === "string" ? defaults.provider : snapshot.status?.provider ?? "");
      setModel(typeof defaults.model === "string" ? defaults.model : snapshot.status?.model ?? "");
      setEffort(typeof defaults.reasoningEffort === "string" ? defaults.reasoningEffort : "high");
    }, [snapshot.phase, defaultNamespace?.revision]);

    const providerDirectory = useMemo(() => {
      const unique = new Map<string, RuntimeProviderView>();
      for (const entry of snapshot.providers?.providers ?? []) {
        const current = unique.get(entry.provider);
        if (!current || (!current.active && entry.active)) unique.set(entry.provider, entry);
      }
      return [...unique.values()];
    }, [snapshot.providers]);
    const editorProvider = providerDirectory.find((entry) => entry.provider === editorProviderId) ?? providerDirectory[0] ?? null;
    useEffect(() => {
      if (!editorProvider) return;
      const config = service.providerConfiguration(editorProvider);
      setBaseURL(config.baseURL);
      setCredentialRef(config.credentialRef);
      setApiKey("");
      setDiscovered(null);
      setCredential(null);
      if (!OAUTH_ONLY_PROVIDERS.has(editorProvider.provider)) {
        void service.describeCredential(config.credentialRef).then(setCredential, () => setCredential(null));
      }
    }, [editorProvider?.provider, snapshot.settings]);

    const activeGroup = useMemo(
      () => snapshot.models?.groups.find((group) => group.id === provider) ?? snapshot.models?.groups[0] ?? null,
      [snapshot.models, provider],
    );
    const selectedModel = activeGroup?.models.find((entry) => entry.id === model) ?? activeGroup?.models[0] ?? null;
    const efforts = selectedModel?.reasoning?.efforts ?? [];
    const writable = snapshot.settings?.writable === true && snapshot.phase === "ready";
    const oauthOnly = editorProvider !== null && OAUTH_ONLY_PROVIDERS.has(editorProvider.provider);
    const editorInput = (): SaveRuntimeProviderInput => ({ baseURL, credentialRef, apiKey });

    const run = async (kind: NonNullable<typeof saving>, action: () => Promise<void>) => {
      setSaving(kind); setActionError(null);
      try { await action(); } catch (error) { setActionError(error instanceof Error ? error.message : String(error)); }
      finally { setSaving(null); }
    };

    return <>
      <SettingsPageHeader
        title="Local Agent"
        description="Configure the Agent runtime bundled with this desktop app. Configuration stays on this device."
      />

      <SettingsSection
        title="Runtime"
        icon={<Bot size={15} />}
        description="The extension edits runtime-owned settings through the local AppServer protocol."
        action={(
          <SettingsButton type="button" disabled={snapshot.phase === "loading"} onClick={() => void service.refresh()}>
            <RefreshCw size={14} /> Refresh
          </SettingsButton>
        )}
      >
        <SettingsGroup>
          <SettingsListItem
            icon={<Bot size={16} />}
            label={snapshot.status?.displayName ?? "DeepSeek Harness"}
            description={snapshot.phase === "loading" ? "Connecting…" : snapshot.phase === "error" ? "Unavailable" : `Version ${snapshot.status?.version ?? "unknown"}`}
            metadata={snapshot.status?.cwd ?? "Local runtime"}
          />
        </SettingsGroup>
        {snapshot.error ? <SettingsNotice tone="error">{snapshot.error}</SettingsNotice> : null}
      </SettingsSection>

      <SettingsSection title="Default model" description="Only active providers appear here. Existing sessions keep their own selection.">
        <SettingsGroup>
          <SettingsRow label="Provider" htmlFor="local-agent-default-provider"><SettingsSelect id="local-agent-default-provider" value={provider} disabled={!writable} onChange={(event) => {
            const nextProvider = event.target.value;
            const nextGroup = snapshot.models?.groups.find((group) => group.id === nextProvider);
            setProvider(nextProvider); setModel(nextGroup?.models[0]?.id ?? "");
            setEffort(nextGroup?.models[0]?.reasoning?.defaultEffort ?? nextGroup?.models[0]?.reasoning?.efforts[0]?.id ?? "off");
          }}>{(snapshot.models?.groups ?? []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</SettingsSelect></SettingsRow>
          <SettingsRow label="Model" htmlFor="local-agent-default-model"><SettingsSelect id="local-agent-default-model" value={model} disabled={!writable || activeGroup === null} onChange={(event) => {
            const next = activeGroup?.models.find((entry) => entry.id === event.target.value);
            setModel(event.target.value); setEffort(next?.reasoning?.defaultEffort ?? next?.reasoning?.efforts[0]?.id ?? "off");
          }}>{(activeGroup?.models ?? []).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</SettingsSelect></SettingsRow>
          <SettingsRow label="Reasoning" htmlFor="local-agent-default-reasoning"><SettingsSelect id="local-agent-default-reasoning" value={effort} disabled={!writable || efforts.length === 0} onChange={(event) => setEffort(event.target.value)}>
            {efforts.length === 0 ? <option value="off">Off</option> : efforts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </SettingsSelect></SettingsRow>
        </SettingsGroup>
        <SettingsActions><SettingsButton variant="primary" type="button" disabled={!writable || !provider || !model || saving !== null}
            onClick={() => void run("model", () => service.saveDefaultModel(provider, model, effort || "off"))}>
            <Save size={14} /> {saving === "model" ? "Saving…" : "Save model"}</SettingsButton></SettingsActions>
      </SettingsSection>

      <SettingsSection
        title="Providers"
        icon={<KeyRound size={15} />}
        description="Installed adapters expose their own configuration address. Saving a dormant provider activates it live."
      >
        <SettingsGroup>
          <SettingsRow label="Provider" htmlFor="local-agent-provider"><SettingsSelect id="local-agent-provider" value={editorProvider?.provider ?? ""} disabled={!writable} onChange={(event) => setEditorProviderId(event.target.value)}>
            {providerDirectory.map((entry) => <option key={`${entry.settingsNs}:${entry.provider}`} value={entry.provider}>
              {entry.displayName}{entry.active ? " · Active" : ""}
            </option>)}</SettingsSelect></SettingsRow>
          {oauthOnly ? <SettingsRow label="Authorization" layout="stacked" controlWidth="wide"><SettingsNotice>
            <strong>ChatGPT sign-in required</strong>
            <span>DSH and pi-ai support Codex through OAuth. OpenCraft has not connected the interactive authorization session yet, so this route cannot be activated safely from this screen.</span>
          </SettingsNotice></SettingsRow> : <>
            <SettingsRow label="Base URL" htmlFor="local-agent-provider-url"><SettingsTextInput id="local-agent-provider-url" value={baseURL} disabled={!writable} placeholder="Use provider default" onChange={(event) => setBaseURL(event.target.value)} /></SettingsRow>
            <SettingsRow label="Credential reference" htmlFor="local-agent-provider-credential"><SettingsTextInput id="local-agent-provider-credential" value={credentialRef} disabled={!writable} placeholder="PROVIDER_API_KEY" onChange={(event) => setCredentialRef(event.target.value)} /></SettingsRow>
            <SettingsRow label="API key" htmlFor="local-agent-provider-key" description={credential?.configured ? `Configured${credential.source ? ` from ${credential.source}` : ""}` : "Write-only credential"}>
              <SettingsTextInput id="local-agent-provider-key" type="password" value={apiKey} disabled={!writable} autoComplete="new-password"
                placeholder={credential?.configured ? "Configured — enter to replace" : "Not configured"} onChange={(event) => setApiKey(event.target.value)} />
            </SettingsRow>
            {discovered ? <SettingsRow label="Discovered models" layout="stacked" controlWidth="wide"><SettingsNotice>
              <strong>{discovered.length} models discovered</strong>
              <span>{discovered.slice(0, 8).map((entry) => entry.name ?? entry.id).join(", ")}{discovered.length > 8 ? "…" : ""}</span>
            </SettingsNotice></SettingsRow> : null}
          </>}
        </SettingsGroup>
        {actionError ? <SettingsNotice tone="error">{actionError}</SettingsNotice> : null}
        {!oauthOnly ? <SettingsActions align="between">
          <div>{credential?.configured && credential.writable ? <SettingsButton variant="danger" type="button" disabled={saving !== null}
            onClick={() => void run("credential", () => service.clearCredential(credentialRef))}><Trash2 size={13} /> Remove key</SettingsButton> : null}</div>
          <div className="settings-control-actions__cluster">
            {editorProvider?.active && editorProvider.settingsPath.length > 0 ? <SettingsButton type="button" disabled={saving !== null}
              onClick={() => void run("provider", () => service.disableProvider(editorProvider))}>Disable</SettingsButton> : null}
            <SettingsButton type="button" disabled={!writable || editorProvider === null || saving !== null}
              onClick={() => void run("discover", async () => setDiscovered(await service.discoverModels(editorProvider!, editorInput())))}>
              <Search size={14} /> {saving === "discover" ? "Inspecting…" : "Inspect models"}</SettingsButton>
            <SettingsButton variant="primary" type="button" disabled={!writable || editorProvider === null || saving !== null}
              onClick={() => void run("provider", async () => { await service.saveProvider(editorProvider!, editorInput()); setApiKey(""); })}>
              <Save size={14} /> {saving === "provider" ? "Saving…" : editorProvider?.active ? "Save provider" : "Activate provider"}</SettingsButton>
          </div>
        </SettingsActions> : null}
      </SettingsSection>
    </>;
  };
}
