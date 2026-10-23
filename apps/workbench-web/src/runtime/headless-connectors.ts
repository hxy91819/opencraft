import { ConnectorApprovalQueue, type ConnectorApprovalPresentation, type ConnectorApproval, type ConnectorManagementClient, type HeadlessConnectorPort, type HeadlessConnectorState } from "@opencraft/workbench-runtime";

/** HTTP is management only. Model calls go directly through Headless session capabilities. */
export class BrowserHeadlessConnectors implements HeadlessConnectorPort {
  private readonly states = new Map<string, HeadlessConnectorState>();
  private readonly listeners = new Set<() => void>();
  private readonly clients = new Map<string, ConnectorManagementClient>();
  private readonly generations = new Map<string, number>();
  private readonly controllers = new Set<AbortController>();
  private readonly timer: ReturnType<typeof setInterval>;
  private disposed = false;
  private polling = false;
  private constructor(private readonly hosts: Readonly<Record<string, string>>) {
    this.timer = setInterval(() => {
      if (this.polling || this.disposed) return;
      this.polling = true;
      void Promise.allSettled([...this.clients.keys()].map(hostId => this.refresh(hostId))).finally(() => { this.polling = false; });
    }, 2000);
  }
  static async open(): Promise<BrowserHeadlessConnectors> {
    if (globalThis.location && !["http:", "https:"].includes(globalThis.location.protocol)) return new BrowserHeadlessConnectors({});
    let response: Response;
    try { response = await fetch("/__opencraft_connectors", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(5000) }); }
    catch { return new BrowserHeadlessConnectors({ "local-codex": "unavailable", "opencraft-server": "unavailable" }); }
    if (response.status === 404) return new BrowserHeadlessConnectors({});
    if (!response.ok) return new BrowserHeadlessConnectors({ "local-codex": "unavailable", "opencraft-server": "unavailable" });
    if (!response.headers.get("content-type")?.includes("application/json")) return new BrowserHeadlessConnectors({});
    const value = await response.json();
    if (value.protocolVersion !== 1 || !value.hosts || typeof value.hosts !== "object" || Array.isArray(value.hosts)) throw new Error("Invalid connector owner");
    return new BrowserHeadlessConnectors(value.hosts);
  }
  hostIds() { return Object.keys(this.hosts); }
  owns(hostId: string) { return Object.hasOwn(this.hosts, hostId); }
  state(hostId: string) { return this.states.get(hostId) ?? null; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish() { if (!this.disposed) for (const listener of this.listeners) listener(); }
  private async request<T>(hostId: string, method: string, params: unknown): Promise<T> {
    if (this.disposed || !this.owns(hostId)) throw new Error("Connector owner unavailable");
    const controller = new AbortController(); this.controllers.add(controller);
    try {
      const response = await fetch("/__opencraft_connectors", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ hostId, method, params }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]) });
      if (!response.ok) { if (response.status === 401 || response.status === 403) { this.states.clear(); this.publish(); } throw new Error("Connector request unavailable; refresh state before retrying a mutation"); }
      const value = await response.json();
      if (this.disposed) throw new Error("Connector owner retired");
      return value as T;
    } finally { this.controllers.delete(controller); }
  }
  client(hostId: string): ConnectorManagementClient {
    if (!this.owns(hostId)) throw new Error("Connector owner unavailable");
    let client = this.clients.get(hostId);
    if (!client) {
      client = { hostId, requestRaw: async <T>(method: string, params: unknown) => {
        const result = await this.request<T>(hostId, method, params);
        if (method !== "connectors/managed/list") void this.refresh(hostId).catch(() => undefined);
        return result;
      }, subscribeNotification: listener => this.subscribe(() => listener({ method: "connectors/managed/changed" })) };
      this.clients.set(hostId, client);
    }
    return client;
  }
  async refresh(hostId: string) {
    const generation = (this.generations.get(hostId) ?? 0) + 1; this.generations.set(hostId, generation);
    try {
      const state = await this.request<HeadlessConnectorState>(hostId, "state", {});
      if (this.generations.get(hostId) !== generation) return;
      this.states.set(hostId, state); this.publish();
    } catch (error) { if (this.generations.get(hostId) === generation) { this.states.delete(hostId); this.publish(); } throw error; }
  }
  async command(hostId: string, method: string, params: unknown) {
    const generation = (this.generations.get(hostId) ?? 0) + 1; this.generations.set(hostId, generation);
    const state = await this.request<HeadlessConnectorState>(hostId, method, params);
    if (this.generations.get(hostId) === generation) { this.states.set(hostId, state); this.publish(); }
  }
  approvals() { return [...this.states.values()].flatMap(s => s.approvals); }
  respond(id: string, allow: boolean) {
    const entry = [...this.states.entries()].find(([, state]) => state.approvals.some(a => a.id === id));
    if (entry) void this.command(entry[0], "approval", { id, allow }).catch(() => { void this.refresh(entry[0]).catch(() => undefined); });
  }
  dispose() { this.disposed = true; clearInterval(this.timer); for (const controller of this.controllers) controller.abort(); this.controllers.clear(); this.states.clear(); this.listeners.clear(); }
}

/** Existing modal consumes one projection of local legacy and Headless-owned decisions. */
export function connectorApprovals(remote: BrowserHeadlessConnectors): ConnectorApprovalPresentation & Pick<ConnectorApprovalQueue, "request" | "dispose"> {
  const local = new ConnectorApprovalQueue(), listeners = new Set<() => void>();
  let snapshot: readonly ConnectorApproval[] = [];
  const publish = () => { snapshot = [...local.getSnapshot(), ...remote.approvals()]; for (const listener of listeners) listener(); };
  const stopLocal = local.subscribe(publish), stopRemote = remote.subscribe(publish);
  return { getSnapshot: () => snapshot, subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    request: (input, signal) => local.request(input, signal),
    respond: (id, allow) => { if (local.getSnapshot().some(a => a.id === id)) local.respond(id, allow); else remote.respond(id, allow); },
    dispose: () => { stopLocal(); stopRemote(); local.dispose(); listeners.clear(); } };
}
