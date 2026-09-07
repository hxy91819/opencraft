import { BrowserToolError, type BrowserDynamicToolContext } from "@opencraft/browser-appserver";
import {
  DEFAULT_BROWSER_VIEWPORT_MODE,
  normalizeBrowserViewportMode,
  parseBrowserUrl,
  type BrowserPageSnapshot,
  type BrowserTabId,
  type BrowserTabSnapshot,
  type BrowserViewportMode,
} from "@opencraft/browser-core";
import { createConversationKey, encodeConversationKey } from "@opencraft/chat-core";
import type { WorkbenchPanelService } from "@opencraft/workbench-panels";
import {
  type ConversationBindingStore,
  type ConversationScopeLeaseRegistry,
  type ConversationScopeId,
} from "@opencraft/workbench-runtime";

import type { WebBrowserPageRuntime } from "./web-browser-runtime";

const STORAGE_KEY = "vela.browser-tabs.v1";

interface StoredBrowserTab {
  readonly id: string;
  readonly pageId: string;
  readonly ownerId: string;
  readonly createdAt: number;
  readonly viewportMode: unknown;
}

export interface BrowserTabWithPage {
  readonly tab: BrowserTabSnapshot;
  readonly page: BrowserPageSnapshot;
}

function createTabId(): BrowserTabId {
  const value = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `tab-${value}` as BrowserTabId;
}

/** Logical-tab owner. Pages own navigation; panels own chrome; Presentations own geometry. */
export class BrowserWorkbenchCoordinator {
  private readonly tabs = new Map<BrowserTabId, BrowserTabSnapshot>();
  private readonly tabListeners = new Map<BrowserTabId, Set<() => void>>();
  private readonly pageSubscriptions = new Map<BrowserTabId, () => void>();
  private readonly tabRetainers = new Map<BrowserTabId, () => void>();
  private readonly presentationViews = new Map<BrowserTabId, Set<string>>();
  private readonly scopeByView = new Map<string, ConversationScopeId>();
  private readonly preferredViewByScope = new Map<ConversationScopeId, string>();
  private readonly closingTabs = new Set<BrowserTabId>();
  private leases: ConversationScopeLeaseRegistry | null = null;

  constructor(
    private readonly pages: WebBrowserPageRuntime,
    private readonly panels: WorkbenchPanelService,
    private readonly bindings: ConversationBindingStore,
  ) {
    this.restoreTabs();
  }

  attachScopeLeases(leases: ConversationScopeLeaseRegistry): void {
    if (this.leases !== null && this.leases !== leases)
      throw new Error("Browser Workbench already belongs to another Conversation Scope registry");
    this.leases = leases;
  }

  getTabSnapshot = (tabId: BrowserTabId): BrowserTabSnapshot | null =>
    this.tabs.get(tabId) ?? null;

  subscribeTab = (tabId: BrowserTabId, listener: () => void): (() => void) => {
    if (!this.tabs.has(tabId)) return () => undefined;
    const listeners = this.tabListeners.get(tabId) ?? new Set<() => void>();
    listeners.add(listener);
    this.tabListeners.set(tabId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.tabListeners.delete(tabId);
    };
  };

  setViewportMode(tabId: BrowserTabId, viewportMode: BrowserViewportMode): void {
    const current = this.requireTab(tabId);
    this.tabs.set(tabId, { ...current, viewportMode });
    this.notifyTab(tabId);
    this.persistTabs();
  }

  pageForTab(tabId: BrowserTabId): BrowserPageSnapshot | null {
    const tab = this.tabs.get(tabId);
    return tab === undefined ? null : this.pages.getSnapshot(tab.pageId);
  }

  listForOwner(ownerId: string): readonly BrowserTabWithPage[] {
    return [...this.tabs.values()]
      .filter((tab) => tab.ownerId === ownerId)
      .sort((left, right) => left.createdAt - right.createdAt)
      .flatMap((tab) => {
        const page = this.pages.getSnapshot(tab.pageId);
        return page === null ? [] : [{ tab, page }];
      });
  }

  bindView(scopeId: ConversationScopeId, viewId: string): void {
    const currentScope = this.scopeByView.get(viewId);
    if (currentScope !== undefined && currentScope !== scopeId)
      throw new Error(`Browser View ${viewId} already belongs to Scope ${currentScope}`);
    if (this.leases?.get(scopeId) === null)
      throw new Error(`Conversation Scope ${scopeId} is unavailable`);
    this.scopeByView.set(viewId, scopeId);
    this.preferredViewByScope.set(scopeId, viewId);
    for (const { tab } of this.listForOwner(scopeId)) {
      this.presentTab(viewId, tab.id, false);
      this.observeTab(tab.id);
    }
  }

  releasePresentation(viewId: string, tabId: BrowserTabId, closeWhenUnpresented = false): void {
    const views = this.presentationViews.get(tabId);
    if (views === undefined) return;
    views.delete(viewId);
    if (views.size !== 0) return;
    this.presentationViews.delete(tabId);
    if (closeWhenUnpresented && !this.closingTabs.has(tabId)) this.destroyTab(tabId);
  }

  releaseView(viewId: string): void {
    const scopeId = this.scopeByView.get(viewId);
    this.scopeByView.delete(viewId);
    if (scopeId !== undefined && this.preferredViewByScope.get(scopeId) === viewId)
      this.preferredViewByScope.delete(scopeId);
    for (const [tabId, views] of this.presentationViews) {
      views.delete(viewId);
      if (views.size === 0) this.presentationViews.delete(tabId);
    }
  }

  scopeForThread(context: BrowserDynamicToolContext): ConversationScopeId {
    const key = createConversationKey(context.hostId, context.threadId);
    const existing = this.bindings.findScope(key);
    if (existing === null) {
      throw new BrowserToolError(
        "TAB_ACCESS_DENIED",
        `Thread ${encodeConversationKey(key)} has no active Conversation Scope`,
      );
    }
    return existing;
  }

  requireOwnedTab(ownerId: string, tabId: BrowserTabId): BrowserTabWithPage {
    const tab = this.tabs.get(tabId);
    if (tab === undefined)
      throw new BrowserToolError("TAB_NOT_FOUND", `Browser tab ${tabId} is unavailable`);
    if (tab.ownerId !== ownerId) {
      throw new BrowserToolError(
        "TAB_ACCESS_DENIED",
        `Browser tab ${tabId} belongs to another Conversation Scope`,
      );
    }
    const page = this.pages.getSnapshot(tab.pageId);
    if (page === null)
      throw new BrowserToolError("TAB_NOT_FOUND", `Browser page ${tab.pageId} is unavailable`);
    return { tab, page };
  }

  open(ownerId: string, options: {
    readonly initialUrl?: string;
    readonly tabId?: BrowserTabId;
    readonly panelOwnerId?: string;
  } = {}) {
    const created = options.tabId === undefined;
    const normalizedUrl = options.initialUrl === undefined
      ? undefined
      : parseBrowserUrl(options.initialUrl);
    let tab: BrowserTabSnapshot;
    if (options.tabId === undefined) {
      const pageId = this.pages.create({
        ownerId,
        ...(normalizedUrl === undefined ? {} : { initialUrl: normalizedUrl }),
      });
      tab = {
        id: createTabId(),
        pageId,
        ownerId,
        createdAt: Date.now(),
        viewportMode: DEFAULT_BROWSER_VIEWPORT_MODE,
      };
      this.tabs.set(tab.id, tab);
      this.persistTabs();
    } else {
      tab = this.requireOwnedTab(ownerId, options.tabId).tab;
    }
    try {
      const panelOwnerId = options.panelOwnerId
        ?? this.preferredViewByScope.get(ownerId as ConversationScopeId);
      const panelTab = panelOwnerId === undefined ? null : this.presentTab(panelOwnerId, tab.id, true);
      this.observeTab(tab.id);
      if (!created && normalizedUrl !== undefined) this.pages.navigate(tab.pageId, normalizedUrl);
      return { tabId: tab.id, pageId: tab.pageId, tab: panelTab };
    } catch (error) {
      if (created) this.destroyTab(tab.id);
      throw error;
    }
  }

  restorePersistedTabs(): void {
    const validPages = new Set(this.tabs.values().map((tab) => tab.pageId));
    for (const page of this.pages.list()) {
      if (!validPages.has(page.id)) this.pages.close(page.id);
    }
    for (const tab of [...this.tabs.values()]) {
      const scopeId = tab.ownerId as ConversationScopeId;
      if (this.pages.getSnapshot(tab.pageId) === null || this.bindings.resolve(scopeId) === null) {
        this.destroyTab(tab.id);
        continue;
      }
      if (this.leases !== null && this.leases.get(scopeId) !== null) this.observeTab(tab.id);
    }
  }

  close(ownerId: string, tabId: BrowserTabId): void {
    this.requireOwnedTab(ownerId, tabId);
    this.closingTabs.add(tabId);
    const views = [...(this.presentationViews.get(tabId) ?? [])];
    this.presentationViews.delete(tabId);
    for (const viewId of views) this.panels.close(viewId, "right", `browser:${tabId}`);
    this.closingTabs.delete(tabId);
    this.destroyTab(tabId);
  }

  disposeOwner(ownerId: string): void {
    for (const { tab } of [...this.listForOwner(ownerId)]) this.close(ownerId, tab.id);
    this.preferredViewByScope.delete(ownerId as ConversationScopeId);
  }

  dispose(): void {
    for (const tabId of [...this.tabs.keys()]) this.stopObserving(tabId);
    this.presentationViews.clear();
    this.scopeByView.clear();
    this.preferredViewByScope.clear();
    this.tabListeners.clear();
  }

  private requireTab(tabId: BrowserTabId): BrowserTabSnapshot {
    const tab = this.tabs.get(tabId);
    if (tab === undefined) throw new Error(`Browser tab ${tabId} is unavailable`);
    return tab;
  }

  private observeTab(tabId: BrowserTabId): void {
    if (this.pageSubscriptions.has(tabId)) return;
    const tab = this.requireTab(tabId);
    const synchronize = () => {
      const page = this.pages.getSnapshot(tab.pageId);
      if (page === null) return;
      for (const viewId of this.presentationViews.get(tabId) ?? []) {
        this.panels.dispatch(viewId, {
          type: "update-tab",
          region: "right",
          tabId: `browser:${tabId}`,
          patch: { title: page.title },
        });
      }
    };
    this.pageSubscriptions.set(tabId, this.pages.subscribe(tab.pageId, synchronize));
    const scopeId = tab.ownerId as ConversationScopeId;
    if (!this.tabRetainers.has(tabId) && this.leases !== null && this.leases.get(scopeId) !== null)
      this.tabRetainers.set(tabId, this.leases.retain(scopeId, `browser-tab:${tabId}`));
    synchronize();
  }

  private stopObserving(tabId: BrowserTabId): void {
    this.pageSubscriptions.get(tabId)?.();
    this.pageSubscriptions.delete(tabId);
    this.tabRetainers.get(tabId)?.();
    this.tabRetainers.delete(tabId);
  }

  private destroyTab(tabId: BrowserTabId): void {
    const tab = this.tabs.get(tabId);
    if (tab === undefined) return;
    this.stopObserving(tabId);
    this.presentationViews.delete(tabId);
    this.tabs.delete(tabId);
    this.tabListeners.get(tabId)?.clear();
    this.tabListeners.delete(tabId);
    if (![...this.tabs.values()].some((candidate) => candidate.pageId === tab.pageId))
      this.pages.close(tab.pageId);
    this.persistTabs();
  }

  private presentTab(viewId: string, tabId: BrowserTabId, activate: boolean) {
    const scopeId = this.scopeByView.get(viewId);
    const tab = this.requireTab(tabId);
    if (scopeId === undefined) throw new Error(`Browser View ${viewId} is not bound`);
    if (tab.ownerId !== scopeId)
      throw new Error(`Browser tab ${tabId} does not belong to View ${viewId}`);
    const panelTab = this.panels.open(viewId, "browser", { browserTabId: tabId }, { activate });
    const views = this.presentationViews.get(tabId) ?? new Set<string>();
    views.add(viewId);
    this.presentationViews.set(tabId, views);
    return panelTab;
  }

  private notifyTab(tabId: BrowserTabId): void {
    for (const listener of this.tabListeners.get(tabId) ?? []) listener();
  }

  private persistTabs(): void {
    const stored: StoredBrowserTab[] = [...this.tabs.values()];
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Browser tabs remain valid in memory when storage is unavailable.
    }
  }

  private restoreTabs(): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;
    for (const candidate of parsed) {
      if (typeof candidate !== "object" || candidate === null) continue;
      const row = candidate as Partial<StoredBrowserTab>;
      if (typeof row.id !== "string" || typeof row.pageId !== "string"
        || typeof row.ownerId !== "string" || typeof row.createdAt !== "number") continue;
      const tab: BrowserTabSnapshot = {
        id: row.id as BrowserTabId,
        pageId: row.pageId as BrowserTabSnapshot["pageId"],
        ownerId: row.ownerId,
        createdAt: row.createdAt,
        viewportMode: normalizeBrowserViewportMode(row.viewportMode),
      };
      this.tabs.set(tab.id, tab);
    }
  }
}
