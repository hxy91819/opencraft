import { lazy, Suspense, useEffect } from "react";
import type { SidebarThread } from "./sidebar";
import { canHandleWorkbenchShortcut } from "../workbench-shortcuts";
import { conversationSearchShortcut } from "./conversation-search-shortcut";
import type { ConversationSearchSource } from "../runtime/conversation-content-search";

const NO_SOURCES: readonly ConversationSearchSource[] = [];
export interface ConversationSearchTarget { readonly turnId: string | null; readonly itemId: string | null; readonly requestId: string }
const ConversationSearchDialog = lazy(async () => {
  const module = await import("./conversation-search-dialog");
  return { default: module.ConversationSearchDialog };
});

export function ConversationSearch({ enabled, open, onOpenChange, threads, loading, sources = NO_SOURCES, onSelectThread }: {
  enabled: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  threads: readonly SidebarThread[];
  loading: boolean;
  sources?: readonly ConversationSearchSource[];
  onSelectThread(hostId: string, threadId: string, target?: ConversationSearchTarget): void;
}) {
  useEffect(() => {
    if (!enabled) return;
    const keydown = (event: KeyboardEvent) => {
      if (!canHandleWorkbenchShortcut(event, ".conversation-search") || !conversationSearchShortcut(event, navigator.platform)) return;
      // Leave another modal's keyboard ownership intact. Our own input can use
      // the same command again without closing or losing its search draft.
      const dialog = (event.target as Element | null)?.closest?.('[role="dialog"], [role="alertdialog"]');
      if (dialog && !dialog.classList.contains("conversation-search")) return;
      event.preventDefault();
      onOpenChange(true);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [enabled, onOpenChange]);
  return enabled && open ? <Suspense fallback={null}><ConversationSearchDialog threads={threads} loading={loading} sources={sources}
    onClose={() => onOpenChange(false)} onSelectThread={onSelectThread} /></Suspense> : null;
}
