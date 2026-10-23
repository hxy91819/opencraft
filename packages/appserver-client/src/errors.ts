import type { JsonRpcErrorObject } from "@opencraft/appserver-protocol";

export type AppServerClientErrorCode =
  | "ABORTED"
  | "CLOSED"
  | "HOST_EXISTS"
  | "HOST_NOT_FOUND"
  | "NOT_CONNECTED"
  | "PROTOCOL_ERROR"
  | "QUEUE_FULL"
  | "TIMEOUT"
  | "TRANSPORT_ERROR";

export class AppServerClientError extends Error {
  constructor(
    readonly code: AppServerClientErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppServerClientError";
  }
}

export class AppServerRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(error: JsonRpcErrorObject) {
    super(error.message);
    this.name = "AppServerRpcError";
    this.code = error.code;
    if ("data" in error) this.data = error.data;
  }
}

export type ThreadUnavailableReason = "archived" | "not-found";

/** Only a Thread RPC rejection can retire a selection; transport errors cannot. */
export function threadUnavailableReason(error: unknown): ThreadUnavailableReason | null {
  if (!(error instanceof AppServerRpcError)) return null;
  const data = typeof error.data === "object" && error.data !== null
    ? error.data as { code?: unknown } : null;
  if (error.code === -32071 || data?.code === "THREAD_ARCHIVED"
    || /\b(?:thread|conversation)\b[^\n]*\b(?:is|was|has been) archived\b|\bcannot resume (?:an? )?archived (?:thread|conversation)\b/iu.test(error.message)) return "archived";
  if (data?.code === "THREAD_NOT_FOUND"
    || /\bno rollout found for thread id\b|\bthread(?:\s+[^\n:]+)?(?:\s+|: )(?:not found|no longer exists)\b|\bthread not found\b/iu.test(error.message)) return "not-found";
  return null;
}

export function isRetryableAppServerRpcError(error: unknown): boolean {
  return error instanceof AppServerRpcError && threadUnavailableReason(error) === null
    && ![-32700, -32600, -32601, -32602].includes(error.code)
    && typeof error.data === "object" && error.data !== null
    && "retryable" in error.data && error.data.retryable === true;
}
