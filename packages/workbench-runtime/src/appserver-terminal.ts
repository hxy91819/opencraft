import type { AppServerClient } from "@opencraft/appserver-client";
import type {
  CommandExecOutputDeltaNotification,
  CommandExecResponse,
} from "@opencraft/appserver-protocol/generated/v2";

export type AppServerTerminalPhase =
  | "running"
  | "stopping"
  | "exited"
  | "failed"
  | "disconnected";

export interface AppServerTerminalOutputChunk {
  readonly sequence: number;
  readonly stream: "stdout" | "stderr";
  readonly deltaBase64: string;
}

export interface AppServerTerminalSnapshot {
  readonly revision: number;
  readonly hostId: string;
  readonly processId: string;
  readonly connectionGeneration: number;
  readonly phase: AppServerTerminalPhase;
  readonly output: readonly AppServerTerminalOutputChunk[];
  readonly exitCode: number | null;
  readonly error: Error | null;
}

export interface OpenAppServerTerminalOptions {
  readonly command: readonly string[];
  readonly cwd?: string | null;
  readonly cols: number;
  readonly rows: number;
  readonly env?: Readonly<Record<string, string | null>>;
  readonly permissionProfile?: string | null;
}

export interface AppServerTerminalSession {
  readonly processId: string;
  getSnapshot(): AppServerTerminalSnapshot;
  subscribe(listener: () => void): () => void;
  write(deltaBase64: string): Promise<void>;
  resize(cols: number, rows: number): Promise<void>;
  terminate(): Promise<void>;
  dispose(): Promise<void>;
}

export interface AppServerTerminalResourcePort {
  open(options: OpenAppServerTerminalOptions): AppServerTerminalSession;
}

interface MutableTerminalSession {
  snapshot: AppServerTerminalSnapshot;
  readonly listeners: Set<() => void>;
  outputBase64Bytes: number;
  disposed: boolean;
}

const DEFAULT_REPLAY_BASE64_LIMIT = 4 * 1024 * 1024;

function positiveCell(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1)
    throw new RangeError(`${name} must be a positive integer`);
  return value;
}

function errorFrom(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Owns connection-scoped AppServer PTYs. A React renderer may observe a
 * session, but only this controller routes process output and controls the
 * underlying command/exec lifetime.
 */
export class AppServerTerminalController implements AppServerTerminalResourcePort {
  private readonly sessions = new Map<string, MutableTerminalSession>();
  private readonly removeNotificationListener: () => void;
  private readonly removeStatusListener: () => void;
  private sequence = 0;
  private outputSequence = 0;
  private disposed = false;

  constructor(
    private readonly hostId: string,
    private readonly client: AppServerClient,
    private readonly replayBase64Limit = DEFAULT_REPLAY_BASE64_LIMIT,
  ) {
    this.removeNotificationListener = client.subscribeNotification((notification) => {
      if (notification.method !== "command/exec/outputDelta") return;
      this.acceptOutput(notification.params as CommandExecOutputDeltaNotification);
    });
    this.removeStatusListener = client.subscribeStatus((status) => {
      if (status.state !== "closed" && status.state !== "failed") return;
      const reason = status.reason ?? "AppServer connection closed";
      for (const session of this.sessions.values()) {
        if (session.snapshot.phase === "running" || session.snapshot.phase === "stopping") {
          this.update(session, {
            phase: "disconnected",
            error: new Error(reason),
          });
        }
      }
    });
  }

  open(options: OpenAppServerTerminalOptions): AppServerTerminalSession {
    if (this.disposed) throw new Error("AppServer terminal controller is disposed");
    if (this.client.status.state !== "open" || this.client.connectionGeneration < 1) {
      throw new Error("AppServer Host is not ready for a terminal");
    }
    if (options.command.length === 0) throw new RangeError("Terminal command must not be empty");
    const cols = positiveCell(options.cols, "Terminal columns");
    const rows = positiveCell(options.rows, "Terminal rows");
    const generation = this.client.connectionGeneration;
    const processId = `opencraft-terminal:${this.hostId}:${generation}:${++this.sequence}`;
    const mutable: MutableTerminalSession = {
      snapshot: Object.freeze({
        revision: 0,
        hostId: this.hostId,
        processId,
        connectionGeneration: generation,
        phase: "running",
        output: Object.freeze([]),
        exitCode: null,
        error: null,
      }),
      listeners: new Set(),
      outputBase64Bytes: 0,
      disposed: false,
    };
    this.sessions.set(processId, mutable);

    const completion = this.client.request("command/exec", {
      command: [...options.command],
      processId,
      tty: true,
      streamStdin: true,
      streamStdoutStderr: true,
      disableOutputCap: true,
      disableTimeout: true,
      cwd: options.cwd ?? null,
      env: options.env === undefined ? null : { ...options.env },
      size: { cols, rows },
      permissionProfile: options.permissionProfile ?? null,
    }, {
      timeoutMs: 0,
      priority: "user-blocking",
    });
    void completion.then(
      (result) => this.complete(mutable, result),
      (cause) => this.fail(mutable, cause),
    );

    let sessionDisposed = false;
    const ensureLiveGeneration = () => {
      if (sessionDisposed || mutable.disposed)
        throw new Error(`Terminal ${processId} is disposed`);
      if (
        mutable.snapshot.phase === "disconnected"
        || mutable.snapshot.connectionGeneration !== this.client.connectionGeneration
      ) {
        throw new Error(`Terminal ${processId} belongs to a closed AppServer connection`);
      }
    };
    return {
      processId,
      getSnapshot: () => mutable.snapshot,
      subscribe: (listener) => {
        if (sessionDisposed || mutable.disposed)
          throw new Error(`Terminal ${processId} is disposed`);
        mutable.listeners.add(listener);
        return () => mutable.listeners.delete(listener);
      },
      write: async (deltaBase64) => {
        ensureLiveGeneration();
        if (mutable.snapshot.phase !== "running")
          throw new Error(`Terminal ${processId} is not accepting input`);
        await this.client.request("command/exec/write", {
          processId,
          deltaBase64,
          closeStdin: false,
        });
      },
      resize: async (nextCols, nextRows) => {
        ensureLiveGeneration();
        if (mutable.snapshot.phase !== "running") return;
        await this.client.request("command/exec/resize", {
          processId,
          size: {
            cols: positiveCell(nextCols, "Terminal columns"),
            rows: positiveCell(nextRows, "Terminal rows"),
          },
        });
      },
      terminate: async () => {
        ensureLiveGeneration();
        if (mutable.snapshot.phase !== "running") return;
        this.update(mutable, { phase: "stopping" });
        try {
          await this.client.request("command/exec/terminate", { processId });
        } catch (cause) {
          this.fail(mutable, cause);
          throw cause;
        }
      },
      dispose: async () => {
        if (sessionDisposed) return;
        sessionDisposed = true;
        const shouldTerminate =
          !mutable.disposed
          && mutable.snapshot.connectionGeneration === this.client.connectionGeneration
          && this.client.status.state === "open"
          && (mutable.snapshot.phase === "running" || mutable.snapshot.phase === "stopping");
        mutable.disposed = true;
        this.sessions.delete(processId);
        mutable.listeners.clear();
        if (shouldTerminate) {
          await this.client.request("command/exec/terminate", { processId }).catch(() => undefined);
        }
      },
    };
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.removeNotificationListener();
    this.removeStatusListener();
    const active = [...this.sessions.entries()].filter(([, session]) =>
      session.snapshot.connectionGeneration === this.client.connectionGeneration
      && (session.snapshot.phase === "running" || session.snapshot.phase === "stopping")
    );
    this.sessions.clear();
    for (const [, session] of active) {
      session.disposed = true;
      session.listeners.clear();
    }
    await Promise.allSettled(active.map(([processId]) =>
      this.client.status.state === "open"
        ? this.client.request("command/exec/terminate", { processId })
        : Promise.resolve()
    ));
  }

  private acceptOutput(output: CommandExecOutputDeltaNotification): void {
    const session = this.sessions.get(output.processId);
    if (session === undefined || session.disposed) return;
    const chunk: AppServerTerminalOutputChunk = Object.freeze({
      sequence: ++this.outputSequence,
      stream: output.stream,
      deltaBase64: output.deltaBase64,
    });
    let chunks = [...session.snapshot.output, chunk];
    session.outputBase64Bytes += output.deltaBase64.length;
    while (
      chunks.length > 1
      && session.outputBase64Bytes > this.replayBase64Limit
    ) {
      session.outputBase64Bytes -= chunks.shift()!.deltaBase64.length;
    }
    this.update(session, { output: Object.freeze(chunks) });
  }

  private complete(session: MutableTerminalSession, result: CommandExecResponse): void {
    if (session.disposed || session.snapshot.phase === "disconnected") return;
    this.update(session, {
      phase: "exited",
      exitCode: result.exitCode,
      error: null,
    });
  }

  private fail(session: MutableTerminalSession, cause: unknown): void {
    if (session.disposed || session.snapshot.phase === "disconnected") return;
    this.update(session, { phase: "failed", error: errorFrom(cause) });
  }

  private update(
    session: MutableTerminalSession,
    patch: Partial<Omit<AppServerTerminalSnapshot, "revision">>,
  ): void {
    if (session.disposed) return;
    session.snapshot = Object.freeze({
      ...session.snapshot,
      ...patch,
      revision: session.snapshot.revision + 1,
    });
    for (const listener of session.listeners) listener();
  }
}
