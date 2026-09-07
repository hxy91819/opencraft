export type RuntimeSettingsApplyMode = "live" | "restart";

export interface RuntimeSettingsSecretView {
  readonly path: readonly string[];
  readonly set: boolean;
}

export interface RuntimeSettingsNamespaceView {
  readonly ns: string;
  readonly schema: unknown;
  readonly value: unknown;
  readonly base?: unknown;
  readonly user?: unknown;
  readonly applies: RuntimeSettingsApplyMode;
  readonly secrets: readonly RuntimeSettingsSecretView[];
  readonly revision: number;
}

export interface RuntimeSettingsDescribeResponse {
  readonly writable: boolean;
  readonly hasDocument: boolean;
  readonly namespaces: readonly RuntimeSettingsNamespaceView[];
}

export type RuntimeSettingsPathOperation =
  | { readonly op: "set"; readonly path: readonly string[]; readonly value: unknown }
  | { readonly op: "unset"; readonly path: readonly string[] };

export interface RuntimeSettingsMutateParams {
  readonly ns: string;
  readonly ops: readonly RuntimeSettingsPathOperation[];
  readonly expectedRevision?: number;
}

export interface RuntimeCredentialView {
  readonly configured: boolean;
  readonly source?: string;
  readonly writable: boolean;
}

export interface RuntimeCredentialsDescribeParams {
  readonly refs: readonly string[];
}

export interface RuntimeCredentialsDescribeResponse {
  readonly credentials: Readonly<Record<string, RuntimeCredentialView>>;
}

export interface RuntimeCredentialSetParams {
  readonly ref: string;
  readonly value: string;
}

export interface RuntimeCredentialUnsetParams {
  readonly ref: string;
}

export interface RuntimeProviderView {
  readonly provider: string;
  readonly displayName: string;
  readonly settingsNs: string;
  readonly settingsPath: readonly string[];
  readonly active: boolean;
  readonly declared?: boolean;
}

export interface RuntimeProvidersListResponse {
  readonly providers: readonly RuntimeProviderView[];
}

export interface RuntimeModelView {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly reasoning?: {
    readonly efforts: readonly { readonly id: string; readonly name: string; readonly description?: string }[];
    readonly defaultEffort?: string;
  };
}

export interface RuntimeModelGroupView {
  readonly id: string;
  readonly name: string;
  readonly models: readonly RuntimeModelView[];
}

export interface RuntimeModelsListResponse {
  readonly groups: readonly RuntimeModelGroupView[];
  readonly failures: readonly { readonly id: string; readonly name: string; readonly message: string }[];
}

export interface RuntimeModelsDiscoverParams {
  readonly settingsNs: string;
  readonly provider?: string;
  readonly baseURL?: string;
  readonly api?: string;
  /** Write-only probe credential. It is never persisted or returned. */
  readonly apiKey?: string;
}

export interface RuntimeDiscoveredModelView {
  readonly id: string;
  readonly name?: string;
  readonly contextWindow?: number;
  readonly maxTokens?: number;
}

export interface RuntimeModelsDiscoverResponse {
  readonly models: readonly RuntimeDiscoveredModelView[];
}

export interface RuntimeStatusResponse {
  readonly engineId: string;
  readonly displayName: string;
  readonly version: string;
  readonly cwd: string;
  readonly provider: string | null;
  readonly model: string | null;
}
