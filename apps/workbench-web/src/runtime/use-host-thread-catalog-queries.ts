import { useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import type { ThreadListResponse } from "@opencraft/appserver-protocol/generated/v2";
import { isHostThreadCatalogUnavailableError, readHostThreadCatalog } from "./host-thread-catalog";
import { sidebarThreadCatalogQueryKey } from "./thread-catalog-query";
import { retryQuery } from "./workbench-application-services";

type CatalogQuery = Omit<Parameters<typeof readHostThreadCatalog>[0], "signal" | "onInitialPage"> & {
  readonly enabled: boolean;
  readonly queryKey: ReturnType<typeof sidebarThreadCatalogQueryKey>;
}

/** A closed or not-yet-readable connection cannot become readable by waiting
 * through the ordinary query backoff. The connection owner drives recovery. */
export function retryHostThreadCatalogQuery(failureCount: number, error: unknown): boolean {
  return isHostThreadCatalogUnavailableError(error) ? false : retryQuery(failureCount, error);
}

/** First-page placeholders belong to this observer, never to the complete
 * directory cache. A later-page failure cannot turn them into cached success. */
export function useHostThreadCatalogQueries(inputs: readonly CatalogQuery[]) {
  const queryClient = useQueryClient();
  const [initialPages, setInitialPages] = useState<ReadonlyMap<string, {
    readonly request: symbol;
    readonly page: ThreadListResponse;
  }>>(() => new Map());
  return useQueries({ queries: inputs.map(input => {
    const key = JSON.stringify(input.queryKey);
    return {
      enabled: input.enabled,
      queryKey: input.queryKey,
      placeholderData: initialPages.get(key)?.page,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const request = Symbol();
        // InvalidateQueries joins an existing cold fetch when it has no cached
        // data. Preserve invalidations caused by edits to already visible rows.
        let invalidatedWhileCold = false;
        const unsubscribe = queryClient.getQueryCache().subscribe(event => {
          if (event.type === "updated" && event.action.type === "invalidate"
            && JSON.stringify(event.query.queryKey) === key
            && queryClient.getQueryData(input.queryKey) === undefined) invalidatedWhileCold = true;
        });
        try {
          const complete = await readHostThreadCatalog({ ...input, signal, onInitialPage: page => {
            // A refresh retains its previous complete snapshot. Cancellation and
            // scoped keys prevent a replaced reader from resurrecting old rows.
            if (signal.aborted || queryClient.getQueryData(input.queryKey) !== undefined) return;
            setInitialPages(previous => new Map(previous).set(key, { request, page }));
          } });
          if (invalidatedWhileCold && !signal.aborted) {
            // The next task runs after Query has committed complete success.
            // Keep that full snapshot while one ordinary refresh catches up;
            // repeated notifications cannot starve initial completion.
            setTimeout(() => {
              if (!signal.aborted && queryClient.getQueryData(input.queryKey) === complete
                && queryClient.getQueryState(input.queryKey)?.fetchStatus === "idle") {
                void queryClient.invalidateQueries({ queryKey: input.queryKey, exact: true });
              }
            }, 0);
          }
          return complete;
        } finally {
          unsubscribe();
          setInitialPages(previous => {
            if (previous.get(key)?.request !== request) return previous;
            const next = new Map(previous); next.delete(key); return next;
          });
        }
      },
      staleTime: 30_000,
      retry: retryHostThreadCatalogQuery,
    };
  }) });
}
