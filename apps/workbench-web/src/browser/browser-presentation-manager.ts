import type { CodexPresentationHost } from "./codex-presentation-host";
import { BrowserPresentationSwitch, type PresentationState } from "./browser-presentation-switch";

interface StorageState {
  readonly browserStorageId: string;
  readonly mode: "ephemeral" | "persistent" | "restore-expected";
}
interface Size { readonly width: number; readonly height: number }
interface ToolbarState {
  readonly responsiveViewportSize: Size | null;
  readonly toolbarState: Size & { readonly isEnabled: boolean; readonly presetId: string };
}
interface MountClaims { generation: number; readonly claims: Set<string> }
interface PageRecord {
  readonly owner: string;
  readonly tab: string;
  readonly mounts: MountClaims;
  snapshot: Record<string, unknown> | null;
  automation: boolean;
  viewport: Size | null;
  toolbar: ToolbarState;
}
type HostConstructor = new (options: Record<string, any>) => CodexPresentationHost;
const identity = (owner: string, tab: string) => `${owner}\0${tab}`;
const initialToolbar = (): ToolbarState => ({ responsiveViewportSize: null,
  toolbarState: { width: 390, height: 844, isEnabled: false, presetId: "responsive" } });

/** Application-owned host registry. Logical pages outlive presentation mounts;
 * registration results are accepted only by the host instance that requested
 * them. This adapter does not implement a remote renderer/adoption protocol. */
export class BrowserPresentationManager {
  readonly webviews = new Map<string, CodexPresentationHost>();
  readonly tabPersistenceStates = new Map<string, StorageState>();
  readonly pagePresentationTransition = new BrowserPresentationSwitch();
  private readonly pages = new Map<string, PageRecord>();
  private readonly listeners = new Set<() => void>();
  private readonly cleanups: Array<() => void> = [];
  private readonly rendererInstanceId = crypto.randomUUID();
  private nextHostGeneration = 0;
  private emptyHost: CodexPresentationHost | null = null;
  private disposed = false;

  constructor(private readonly Host: HostConstructor) {
    const focus = () => this.resync();
    const visible = () => { if (document.visibilityState === "visible") this.resync(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visible);
    this.cleanups.push(() => window.removeEventListener("focus", focus),
      () => document.removeEventListener("visibilitychange", visible));
  }
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getExistingBrowserStorageId(owner: string, tab: string): string | null {
    return this.tabPersistenceStates.get(identity(owner, tab))?.browserStorageId ?? null;
  }
  getBrowserStorageId(owner: string, tab: string): string {
    this.assertOpen();
    const key = identity(owner, tab);
    let state = this.tabPersistenceStates.get(key);
    if (!state) {
      state = { browserStorageId: `browser:${crypto.randomUUID()}`, mode: "ephemeral" };
      this.tabPersistenceStates.set(key, state);
    }
    return state.browserStorageId;
  }
  restorePersistedPageState(owner: string, tab: string, browserStorageId: string): void {
    this.assertOpen();
    this.tabPersistenceStates.set(identity(owner, tab), { browserStorageId, mode: "restore-expected" });
    this.emit();
  }
  getPagePersistence(owner: string, tab: string): { browserStorageId: string; restore: "none" | "required" } {
    const browserStorageId = this.getBrowserStorageId(owner, tab);
    const key = identity(owner, tab);
    if (this.tabPersistenceStates.get(key)?.mode === "restore-expected") return { browserStorageId, restore: "required" };
    this.tabPersistenceStates.set(key, { browserStorageId, mode: "persistent" });
    return { browserStorageId, restore: "none" };
  }
  getWebview(owner: string, tab: string, _initialUrl: string, options?: { hostKind?: string }): CodexPresentationHost {
    this.assertOpen();
    const key = identity(owner, tab);
    const persistence = this.getPagePersistence(owner, tab);
    const existing = this.webviews.get(key);
    if (existing) {
      existing.setHostKind(options?.hostKind ?? "right-panel");
      if (existing.setPagePersistence(persistence)) this.register(key, existing);
      return existing;
    }
    const page = this.page(owner, tab);
    const host = new this.Host({ conversationId: owner, browserTabId: tab, partition: key,
      elementKey: key, hostKind: options?.hostKind ?? "right-panel", pagePersistence: persistence,
      rendererInstanceId: this.rendererInstanceId, hostGeneration: ++this.nextHostGeneration });
    this.webviews.set(key, host);
    host.setBrowserUseActive(page.automation);
    if (page.viewport) host.setBrowserUseViewportSize(page.viewport);
    this.register(key, host);
    this.emit();
    return host;
  }
  getSnapshot(owner: string, tab: string): Record<string, unknown> | null {
    return this.pages.get(identity(owner, tab))?.snapshot ?? null;
  }
  setSnapshot(owner: string, tab: string, snapshot: Record<string, unknown>): void {
    if (this.disposed) return;
    this.page(owner, tab).snapshot = snapshot;
    this.emit();
  }
  claimMountGeneration(owner: string, tab: string, claim = "default"): number {
    this.assertOpen();
    const mounts = this.page(owner, tab).mounts;
    if (!mounts.claims.size) mounts.generation++;
    mounts.claims.add(claim);
    return mounts.generation;
  }
  releaseMountGeneration(owner: string, tab: string, claim = "default", generation?: number): number {
    const mounts = this.pages.get(identity(owner, tab))?.mounts;
    if (!mounts) return 0;
    if (generation === undefined || generation === mounts.generation) mounts.claims.delete(claim);
    return mounts.generation;
  }
  hasOtherMountGenerationClaim(owner: string, tab: string, claim = "default", generation?: number): boolean {
    const mounts = this.pages.get(identity(owner, tab))?.mounts;
    return Boolean(mounts && (generation === undefined || generation === mounts.generation)
      && [...mounts.claims].some(value => value !== claim));
  }
  markWebviewAttached(owner: string, tab: string, generation: number): void {
    if (this.disposed) return;
    const key = identity(owner, tab);
    this.pagePresentationTransition.acknowledgeAttachment(this.webviews.get(key) ?? null,
      generation, this.pages.get(key)?.mounts.generation ?? 0);
  }
  syncElectronWebview(host: CodexPresentationHost, state: PresentationState, reference: object, surface = "right-panel"): void {
    this.pagePresentationTransition.sync(host, state, reference, surface);
  }
  setDeviceToolbarTabState(owner: string, tab: string, update: (previous: ToolbarState) => ToolbarState): void {
    if (this.disposed) return;
    const page = this.page(owner, tab);
    page.toolbar = update(page.toolbar);
  }
  getDeviceToolbarTabState(owner: string, tab: string): ToolbarState {
    return this.pages.get(identity(owner, tab))?.toolbar ?? initialToolbar();
  }
  isBrowserUseActive(owner: string, tab: string): boolean {
    return this.pages.get(identity(owner, tab))?.automation ?? false;
  }
  setBrowserUseActive(owner: string, tab: string, active: boolean): void {
    if (this.disposed) return;
    this.page(owner, tab).automation = active;
    this.webviews.get(identity(owner, tab))?.setBrowserUseActive(active);
    this.emit();
  }
  setBrowserUseViewportSize(owner: string, tab: string, size: Size | null): void {
    if (this.disposed) return;
    const page = this.page(owner, tab);
    page.viewport = size;
    this.webviews.get(identity(owner, tab))?.setBrowserUseViewportSize(size);
  }
  releaseBrowserUseTab(owner: string, tab: string): void {
    if (this.disposed) return;
    const page = this.pages.get(identity(owner, tab));
    if (page) { page.automation = false; page.viewport = null; }
    this.webviews.get(identity(owner, tab))?.releaseBrowserUse();
    this.releaseEmptyHost();
    this.emit();
  }
  setPrewarmedEmptyWebview(host: CodexPresentationHost, empty: boolean): void {
    if (!empty) { if (this.emptyHost === host) this.emptyHost = null; return; }
    if (this.emptyHost !== host) this.releaseEmptyHost();
    this.emptyHost = host;
  }
  removeTab(owner: string, tab: string): void {
    const key = identity(owner, tab);
    const host = this.webviews.get(key);
    if (host) this.pagePresentationTransition.removeTab(host);
    this.pages.delete(key);
    this.tabPersistenceStates.delete(key);
    this.emit();
  }
  disposeWebviewHost(_owner: string, _tab: string, key: string, _reason: string): void {
    const host = this.webviews.get(key);
    if (!host) return;
    this.webviews.delete(key);
    if (this.emptyHost === host) this.emptyHost = null;
    this.pagePresentationTransition.disposeHost(host);
    host.dispose();
  }
  disposeAll(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const remove of this.cleanups.splice(0)) remove();
    this.pagePresentationTransition.disposeAll();
    for (const host of this.webviews.values()) host.dispose();
    this.webviews.clear(); this.pages.clear(); this.tabPersistenceStates.clear();
    this.emptyHost = null; this.listeners.clear();
  }
  private page(owner: string, tab: string): PageRecord {
    const key = identity(owner, tab);
    let page = this.pages.get(key);
    if (!page) {
      page = { owner, tab, mounts: { generation: 0, claims: new Set() }, snapshot: null,
        automation: false, viewport: null, toolbar: initialToolbar() };
      this.pages.set(key, page);
    }
    return page;
  }
  private register(key: string, host: CodexPresentationHost): void {
    void host.whenReady().then(() => {
      if (!this.disposed && this.webviews.get(key) === host && host.markRegistered()) this.emit();
    }).catch(() => {
      if (!this.disposed && this.webviews.get(key) === host) {
        this.disposeWebviewHost(host.getConversationId(), host.getBrowserTabId(), key, "unavailable");
        this.emit();
      }
    });
  }
  private resync(): void { for (const host of this.webviews.values()) host.resync(); }
  private releaseEmptyHost(): void {
    const host = this.emptyHost;
    if (!host) return;
    const key = identity(host.getConversationId(), host.getBrowserTabId());
    const page = this.pages.get(key);
    if (!page || page.automation || page.mounts.claims.size || page.snapshot?.tabType !== "new-tab-page" || page.snapshot.url) return;
    this.disposeWebviewHost(page.owner, page.tab, key, "unused");
  }
  private emit(): void { for (const listener of this.listeners) listener(); }
  private assertOpen(): void { if (this.disposed) throw new Error("Browser presentation manager is disposed"); }
}
