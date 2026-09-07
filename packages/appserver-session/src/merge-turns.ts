import type { AppServerThreadItem, AppServerTurn } from "@opencraft/appserver-protocol";

function mergeItems(
  existing: readonly AppServerThreadItem[] = [],
  incoming: readonly AppServerThreadItem[] = [],
): readonly AppServerThreadItem[] {
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const existingIds = new Set(existing.map((item) => item.id));
  return [
    ...existing.map((item) => incomingById.has(item.id) ? { ...item, ...incomingById.get(item.id) } : item),
    ...incoming.filter((item) => !existingIds.has(item.id)),
  ];
}

function mergeTurn(existing: AppServerTurn, incoming: AppServerTurn): AppServerTurn {
  return {
    ...existing,
    ...incoming,
    items: mergeItems(existing.items, incoming.items),
  };
}

/** Stable-ID merge used when buffered streaming notifications race hydration. */
export function mergeTurns(
  existing: readonly AppServerTurn[],
  incoming: readonly AppServerTurn[],
  options: { placement?: "prepend" | "append" } = {},
): readonly AppServerTurn[] {
  const incomingById = new Map(incoming.map((turn) => [turn.id, turn]));
  const existingIds = new Set(existing.map((turn) => turn.id));
  const result = existing.map((turn) => {
    const replacement = incomingById.get(turn.id);
    return replacement === undefined ? turn : mergeTurn(turn, replacement);
  });
  const uniqueIncoming = incoming.filter((turn) => !existingIds.has(turn.id));
  if (options.placement === "prepend") result.unshift(...uniqueIncoming);
  else result.push(...uniqueIncoming);
  return result;
}
