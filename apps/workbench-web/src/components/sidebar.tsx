// Semantically restored from the r1442 AppShell left-panel ownership model.
import {
  Blocks,
  Bot,
  ChevronDown,
  Cloud,
  Database,
  Folder,
  HardDrive,
  Plus,
  Server,
  Settings,
  SquarePen,
} from "lucide-react";
import type { WorkbenchThread } from "@opencraft/workbench-runtime";
import type {
  SidebarEntity,
  SidebarEntityCreationCommand,
  SidebarLayoutStore,
} from "@opencraft/sidebar-layout";
import type { ReactNode } from "react";
import { SidebarBots, SidebarEntityDndCoordinator } from "./sidebar-bots";

interface SidebarThread extends WorkbenchThread {
  readonly hostId: string;
  readonly hostLabel: string;
}

export interface SidebarActionItem {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly active?: boolean;
  readonly onInvoke: () => void;
}

export interface SidebarCatalogItem {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly initiallyCollapsed?: boolean;
  readonly content: ReactNode;
}
import { useLayoutEffect, useRef, useState } from "react";

interface SidebarProps {
  threads: readonly SidebarThread[];
  activeHostId: string;
  activeThreadId: string;
  pendingHostId?: string | null;
  pendingThreadId?: string | null;
  primaryActions?: readonly SidebarActionItem[];
  footerActions?: readonly SidebarActionItem[];
  catalogs?: readonly SidebarCatalogItem[];
  bots?: readonly SidebarEntity[];
  sidebarLayout: SidebarLayoutStore;
  botCreation?: SidebarEntityCreationCommand | null;
  onSelectThread(hostId: string, id: string): void;
  onNewTask(): void;
  onOpenSettings(): void;
}

function SidebarContributionIcon({ name, size = 15 }: { name?: string; size?: number }) {
  switch (name) {
    case "cloud": return <Cloud size={size} />;
    case "database": return <Database size={size} />;
    case "folder": return <Folder size={size} />;
    case "hard-drive": return <HardDrive size={size} />;
    case "server": return <Server size={size} />;
    case "bot": return <Bot size={size} />;
    default: return <Blocks size={size} />;
  }
}

function ExtensionCatalog({ catalog }: { readonly catalog: SidebarCatalogItem }) {
  const [collapsed, setCollapsed] = useState(catalog.initiallyCollapsed ?? false);
  return (
    <section className="sidebar-extension-catalog" aria-label={catalog.title}>
      <button
        className="sidebar-section-heading sidebar-extension-catalog__heading"
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <ChevronDown size={12} className={collapsed ? "is-collapsed" : undefined} />
        <SidebarContributionIcon name={catalog.icon} size={13} />
        <span>{catalog.title}</span>
      </button>
      {collapsed ? null : (
        <div className="sidebar-extension-catalog__content">{catalog.content}</div>
      )}
    </section>
  );
}

function ThreadActivity({ status }: { status: WorkbenchThread["status"] }) {
  if (status === "running")
    return (
      <span
        className="sidebar-thread__activity is-running"
        aria-label="Running"
      />
    );
  if (status === "review")
    return (
      <span
        className="sidebar-thread__activity is-review"
        aria-label="Ready for review"
      />
    );
  return <span className="sidebar-thread__activity" aria-hidden="true" />;
}

export function Sidebar({
  threads,
  activeHostId,
  activeThreadId,
  pendingHostId = null,
  pendingThreadId = null,
  primaryActions = [],
  footerActions = [],
  catalogs = [],
  bots = [],
  sidebarLayout,
  botCreation = null,
  onSelectThread,
  onNewTask,
  onOpenSettings,
}: SidebarProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedThreadKey =
    pendingThreadId === null
      ? `${activeHostId}:${activeThreadId}`
      : `${pendingHostId ?? activeHostId}:${pendingThreadId}`;

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const activeThread = container?.querySelector<HTMLElement>(
      ".sidebar-thread.is-selected",
    );
    if (container == null || activeThread == null) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeThread.getBoundingClientRect();
    if (
      activeRect.top < containerRect.top ||
      activeRect.bottom > containerRect.bottom
    ) {
      activeThread.scrollIntoView({ block: "nearest" });
    }
  }, [selectedThreadKey, threads.length]);

  return (
    <SidebarEntityDndCoordinator items={bots} layout={sidebarLayout}>
      <div className="sidebar-panel" data-app-shell-focus-area="left-panel">
      <nav className="sidebar-navigation" aria-label="Primary">
        <button className="sidebar-action" type="button" onClick={onNewTask}>
          <SquarePen size={15} />
          <span>New chat</span>
        </button>
        {primaryActions.map((action) => (
          <button
            className="sidebar-action"
            type="button"
            key={action.id}
            aria-current={action.active ? "page" : undefined}
            onClick={action.onInvoke}
          >
            <SidebarContributionIcon name={action.icon} />
            <span>{action.title}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-content-scroll" ref={scrollContainerRef}>
        <SidebarBots
          items={bots}
          creation={botCreation}
        />

        {catalogs.map((catalog) => (
          <ExtensionCatalog key={catalog.id} catalog={catalog} />
        ))}

        <section className="sidebar-tasks" aria-label="Tasks">
          <div className="sidebar-section-heading">
            <button type="button">
              <ChevronDown size={12} />
              <span>Tasks</span>
            </button>
            <button type="button" aria-label="New task" onClick={onNewTask}>
              <Plus size={13} />
            </button>
          </div>
          <div className="sidebar-thread-list">
            {threads.map((thread) => {
            const threadKey = `${thread.hostId}:${thread.id}`;
            const active =
              thread.hostId === activeHostId && thread.id === activeThreadId;
            const pending =
              thread.hostId === pendingHostId && thread.id === pendingThreadId;
            const selected = threadKey === selectedThreadKey;
            return (
              <button
                type="button"
                key={threadKey}
                className={[
                  "sidebar-thread",
                  selected ? "is-selected" : "",
                  active ? "is-active" : "",
                  pending ? "is-pending" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelectThread(thread.hostId, thread.id)}
                aria-current={selected ? "page" : undefined}
                aria-busy={pending || undefined}
                title={`${thread.title} · ${thread.hostLabel} · ${thread.id}`}
              >
                <ThreadActivity status={thread.status} />
                <span className="sidebar-thread__copy">
                  <span className="sidebar-thread__label">{thread.title}</span>
                  <small>
                    {thread.project} · {thread.hostLabel}
                    {thread.lineage === "root"
                      ? null
                      : ` · ${thread.lineage} ${thread.id.slice(-6)}`}
                  </small>
                </span>
                {thread.unread ? (
                  <span className="sidebar-thread__unread" />
                ) : null}
              </button>
            );
            })}
          </div>
        </section>
      </div>

      <div className="sidebar-panel__footer">
        {footerActions.map((action) => (
          <button
            className="sidebar-action"
            type="button"
            key={action.id}
            aria-current={action.active ? "page" : undefined}
            onClick={action.onInvoke}
          >
            <SidebarContributionIcon name={action.icon} />
            <span>{action.title}</span>
          </button>
        ))}
        <button
          className="sidebar-action"
          type="button"
          onClick={onOpenSettings}
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>
      </div>
    </SidebarEntityDndCoordinator>
  );
}
