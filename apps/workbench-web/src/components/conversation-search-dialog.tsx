import { useEffect, useId, useRef, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { useIntl } from "@opencraft/i18n/react";
import type { SidebarThread } from "./sidebar";
import { useShellPresentation } from "./shell-presentation";
import { ModalSurface } from "./modal/modal-surface";
import "./conversation-search.scss";
import { isUnsupportedSearch, mergeConversationSearchResults, type ConversationSearchRow, type ConversationSearchSource } from "../runtime/conversation-content-search";
import { useConversationContentSearch } from "./use-conversation-content-search";
import type { ConversationSearchTarget } from "./conversation-search";

function SearchSnippet({ text, term }: { text: string; term: string }) {
  const start = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  return <span className="conversation-search__snippet">{start < 0 || !term ? text : <>
    {text.slice(0, start)}<mark>{text.slice(start, start + term.length)}</mark>{text.slice(start + term.length)}
  </>}</span>;
}

export function ConversationSearchDialog({ threads, loading, sources, onClose, onSelectThread }: {
  threads: readonly SidebarThread[];
  loading: boolean;
  onClose(): void;
  sources: readonly ConversationSearchSource[];
  onSelectThread(hostId: string, threadId: string, target?: ConversationSearchTarget): void;
}) {
  const intl = useIntl();
  const shell = useShellPresentation();
  const label = intl.formatMessage({ id: "sidebar.search", defaultMessage: "Search conversations" });
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState(false);
  const selection = useRef<AbortController | null>(null);
  const listId = useId();
  const list = useRef<HTMLDivElement>(null);
  const normalized = query.trim().toLocaleLowerCase(intl.locale);
  const content = useConversationContentSearch(query.trim(), sources);
  const results = mergeConversationSearchResults(threads.filter(thread => thread.title.toLocaleLowerCase(intl.locale).includes(normalized)),
    content.rows.flatMap(row => row.matches));
  const busy = loading || content.pending;
  const selectable = results.filter(thread => thread.interactionAvailable !== false);
  const selected = selectable[Math.min(active, Math.max(0, selectable.length - 1))];
  const selectedIndex = selected ? results.indexOf(selected) : -1;
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected?.connectionHostId, selected?.id]);
  useEffect(() => () => selection.current?.abort(), [query, sources]);
  const select = async (thread: ConversationSearchRow) => {
    selection.current?.abort();
    const abort = new AbortController(); selection.current = abort;
    setSelectionError(false);
    setSelecting(true);
    try {
      let target: ConversationSearchTarget | undefined;
      if (thread.searchTerm) {
        const source = sources.find(value => value.hostId === thread.connectionHostId);
        if (!source) throw new Error("Search source unavailable");
        const occurrence = await source.locate(thread.searchTerm, thread.id, abort.signal).catch(error => {
          if (isUnsupportedSearch(error)) return null;
          throw error;
        });
        // Native text search can match older raw-history content that is not
        // addressable as a visible message. Keep the conversation accessible,
        // with an explicit positioning notice rather than a fabricated target.
        target = { turnId: occurrence?.turnId ?? null, itemId: occurrence?.itemId ?? null, requestId: crypto.randomUUID() };
      }
      if (abort.signal.aborted) return;
      onSelectThread(thread.connectionHostId, thread.id, target);
      shell?.dismissSidebarAfterSelection();
      onClose();
    } catch {
      if (!abort.signal.aborted) setSelectionError(true);
    } finally {
      if (selection.current === abort) setSelecting(false);
    }
  };
  return <ModalSurface label={label} appearance="utility" size="wide" className="conversation-search" onDismiss={onClose}>
    <div className="conversation-search__input">
      <Search size={18} aria-hidden="true" />
      <input type="search" role="combobox" aria-label={label} placeholder={label}
        aria-autocomplete="list" aria-expanded="true" aria-controls={listId}
        aria-activedescendant={selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
        value={query} onChange={event => { selection.current?.abort(); setSelecting(false); setSelectionError(false); setQuery(event.target.value); setActive(0); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActive(current => (Math.min(current, Math.max(0, selectable.length - 1)) + (event.key === "ArrowDown" ? 1 : -1) + selectable.length) % (selectable.length || 1));
          } else if (event.key === "Enter" && selected && !selecting) { event.preventDefault(); void select(selected); }
        }} />
    </div>
    <div className="conversation-search__body">
    <h2 className="conversation-search__heading">{normalized ? label : intl.formatMessage({ id: "sidebar.flow.recent", defaultMessage: "Recent" })}</h2>
    <div className="conversation-search__scope">{intl.formatMessage({ id: "sidebar.search.scope", defaultMessage: "All servers · Titles and Codex messages" })}</div>
    <div className="conversation-search__results" ref={list} role="listbox" id={listId} aria-label={label} aria-busy={busy || selecting}>
      {results.map((thread, index) => <button type="button" role="option" tabIndex={-1}
        key={JSON.stringify([thread.connectionHostId, thread.id])} id={`${listId}-${index}`}
        aria-selected={index === selectedIndex} disabled={thread.interactionAvailable === false}
        onMouseMove={() => { const next = selectable.indexOf(thread); if (next >= 0) setActive(next); }}
        onClick={() => { if (!selecting) void select(thread); }}>
        <span className="conversation-search__result-icon" aria-hidden="true"><MessageSquare size={20} /></span>
        <span className="conversation-search__text"><span className="conversation-search__title">{thread.title}</span>
          {thread.snippet ? <SearchSnippet text={thread.snippet} term={thread.searchTerm ?? ""} /> : null}</span>
        <span className="conversation-search__server">{thread.serverOrigin.label}</span>
      </button>)}
    </div>
    {normalized && content.rows.length ? <div className="conversation-search__sources">
      {content.rows.map(row => <div key={row.source.key}>
        <span>{row.source.label} · {intl.formatMessage(row.phase === "loading"
          ? { id: "sidebar.search.bodyLoading", defaultMessage: "Searching messages…" }
          : row.phase === "error" ? { id: "sidebar.search.bodyError", defaultMessage: "Message search failed" }
          : row.phase === "unsupported" ? { id: "sidebar.search.bodyUnsupported", defaultMessage: "Title search only" }
          : row.phase === "unavailable" ? { id: "sidebar.search.bodyUnavailable", defaultMessage: "Not connected · messages not searched" }
          : row.cursor ? { id: "sidebar.search.bodyMore", defaultMessage: "More message matches available" }
          : { id: "sidebar.search.bodyComplete", defaultMessage: "Messages searched" })}</span>
        {row.phase === "error" || (row.phase === "ready" && row.cursor) ? <button type="button" onClick={() => content.load(row)}>
          {intl.formatMessage(row.phase === "error" ? { id: "sidebar.search.retry", defaultMessage: "Retry" } : { id: "sidebar.search.loadMore", defaultMessage: "Load more matches" })}
        </button> : null}
      </div>)}
    </div> : null}
    <div className="conversation-search__status" role="status">
      {selectionError ? intl.formatMessage({ id: "sidebar.search.locateError", defaultMessage: "Could not locate this message. Try again." })
        : selecting ? intl.formatMessage({ id: "sidebar.search.locating", defaultMessage: "Opening matching message…" })
        : busy ? intl.formatMessage({ id: "sidebar.search.loading", defaultMessage: "Loading conversations…" })
        : results.length ? intl.formatMessage({ id: "sidebar.search.count", defaultMessage: "{count} conversations" }, { count: results.length })
        : intl.formatMessage(content.rows.some(row => row.phase === "error" || row.phase === "unavailable" || row.phase === "loading" || row.cursor !== null)
          ? { id: "sidebar.search.incomplete", defaultMessage: "No matches yet · message search is incomplete" }
          : { id: "sidebar.search.empty", defaultMessage: "No matching conversations" })}
    </div>
    </div>
  </ModalSurface>;
}
