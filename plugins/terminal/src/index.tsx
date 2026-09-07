import type { Context } from "@deepseek-ai/cordis";
import type { PanelRendererProps } from "@opencraft/workbench-panels-react";
import type {
  AppServerTerminalSession,
  AppServerWorkbenchRuntime,
} from "@opencraft/workbench-runtime";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export interface WorkbenchTerminalOpenOptions {
  readonly hostId: string;
  readonly cwd: string | null;
  readonly cols?: number;
  readonly rows?: number;
}

interface OwnedTerminalSession {
  readonly hostId: string;
  readonly session: AppServerTerminalSession;
}

export class WorkbenchTerminalSessionRegistry {
  private readonly sessions = new Map<string, OwnedTerminalSession>();
  private disposed = false;

  constructor(
    private readonly resolveRuntime: (hostId: string) => AppServerWorkbenchRuntime,
  ) {}

  isAvailable(hostId: string): boolean {
    if (this.disposed) return false;
    try {
      return this.resolveRuntime(hostId).getSnapshot().phase === "ready";
    } catch {
      return false;
    }
  }

  open(options: WorkbenchTerminalOpenOptions): string {
    if (this.disposed) throw new Error("Workbench terminal registry is disposed");
    const runtime = this.resolveRuntime(options.hostId);
    const session = runtime.resources.terminal.open({
      command: ["/bin/bash", "--noprofile", "--norc"],
      cwd: options.cwd,
      cols: options.cols ?? 80,
      rows: options.rows ?? 24,
    });
    this.sessions.set(session.processId, {
      hostId: options.hostId,
      session,
    });
    return session.processId;
  }

  get(sessionId: string): AppServerTerminalSession | null {
    return this.sessions.get(sessionId)?.session ?? null;
  }

  release(sessionId: string): void {
    const owned = this.sessions.get(sessionId);
    if (owned === undefined) return;
    this.sessions.delete(sessionId);
    void owned.session.dispose();
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const sessions = [...this.sessions.values()];
    this.sessions.clear();
    await Promise.allSettled(sessions.map(({ session }) => session.dispose()));
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const stride = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + stride));
  }
  return window.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function terminalTheme(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    background: read("--color-background-surface", "#ffffff"),
    foreground: read("--color-text", "#202124"),
    cursor: read("--color-text", "#202124"),
    cursorAccent: read("--color-background-surface", "#ffffff"),
    selectionBackground: "rgba(108, 137, 255, 0.28)",
    black: "#1f2328",
    red: "#d1242f",
    green: "#1a7f37",
    yellow: "#9a6700",
    blue: "#0969da",
    magenta: "#8250df",
    cyan: "#1b7c83",
    white: "#d0d7de",
    brightBlack: "#57606a",
    brightRed: "#cf222e",
    brightGreen: "#2da44e",
    brightYellow: "#bf8700",
    brightBlue: "#218bff",
    brightMagenta: "#a475f9",
    brightCyan: "#3192aa",
    brightWhite: "#f6f8fa",
  };
}

function createTerminalPanel(registry: WorkbenchTerminalSessionRegistry) {
  return function TerminalPanel({ tab }: PanelRendererProps) {
    const sessionId = tab.resource ?? "";
    const session = registry.get(sessionId);
    const slotRef = useRef<HTMLDivElement | null>(null);
    const [presentationError, setPresentationError] = useState<Error | null>(null);
    const emptySnapshot = useMemo(() => Object.freeze({
      revision: 0,
      hostId: "",
      processId: sessionId,
      connectionGeneration: 0,
      phase: "failed" as const,
      output: Object.freeze([]),
      exitCode: null,
      error: new Error("Terminal session is unavailable"),
    }), [sessionId]);
    const snapshot = useSyncExternalStore(
      session === null ? () => () => undefined : session.subscribe,
      session === null ? () => emptySnapshot : session.getSnapshot,
      session === null ? () => emptySnapshot : session.getSnapshot,
    );

    useEffect(() => {
      const slot = slotRef.current;
      if (slot === null || session === null) return;
      let disposed = false;
      let frameId: number | null = null;
      let removeSessionListener: () => void = () => undefined;
      let resizeObserver: ResizeObserver | null = null;
      let themeObserver: MutationObserver | null = null;
      let terminal: import("@xterm/xterm").Terminal | null = null;
      let lastOutputSequence = 0;

      const mount = async () => {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          import("@xterm/xterm/css/xterm.css"),
        ]);
        if (disposed) return;
        terminal = new Terminal({
          allowProposedApi: false,
          convertEol: true,
          cursorBlink: true,
          cursorStyle: "bar",
          fontFamily:
            getComputedStyle(slot)
              .getPropertyValue("--font-family-mono")
              .trim() ||
            '"SF Mono", "SFMono-Regular", "JetBrains Mono Variable", ui-monospace, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.22,
          scrollback: 10_000,
          theme: terminalTheme(slot),
        });
        const fit = new FitAddon();
        terminal.loadAddon(fit);
        terminal.open(slot);
        themeObserver = new MutationObserver(() => {
          if (terminal !== null) terminal.options.theme = terminalTheme(slot);
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "data-theme", "style"],
        });

        const writePendingOutput = () => {
          if (terminal === null) return;
          const current = session.getSnapshot();
          for (const chunk of current.output) {
            if (chunk.sequence <= lastOutputSequence) continue;
            lastOutputSequence = chunk.sequence;
            terminal.write(base64ToBytes(chunk.deltaBase64));
          }
        };
        writePendingOutput();
        removeSessionListener = session.subscribe(writePendingOutput);
        const input = terminal.onData((data) => {
          const bytes = new TextEncoder().encode(data);
          void session.write(bytesToBase64(bytes)).catch(setPresentationError);
        });

        const fitAndPublish = () => {
          frameId = null;
          if (disposed || terminal === null || slot.clientWidth < 1 || slot.clientHeight < 1)
            return;
          fit.fit();
          void session.resize(terminal.cols, terminal.rows).catch((error) => {
            if (session.getSnapshot().phase === "running") setPresentationError(error as Error);
          });
        };
        const scheduleFit = () => {
          if (frameId === null) frameId = window.requestAnimationFrame(fitAndPublish);
        };
        resizeObserver = new ResizeObserver(scheduleFit);
        resizeObserver.observe(slot);
        scheduleFit();
        terminal.focus();

        return () => {
          input.dispose();
        };
      };

      let cleanupInput: (() => void) | undefined;
      void mount().then((cleanup) => {
        if (disposed) cleanup?.();
        else cleanupInput = cleanup;
      }, (cause) => {
        if (!disposed) setPresentationError(cause instanceof Error ? cause : new Error(String(cause)));
      });

      return () => {
        disposed = true;
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        cleanupInput?.();
        resizeObserver?.disconnect();
        themeObserver?.disconnect();
        removeSessionListener();
        terminal?.dispose();
      };
    }, [session]);

    if (session === null) {
      return (
        <div className="right-panel-empty">
          <strong>Terminal session unavailable</strong>
          <p>This PTY belongs to an earlier AppServer connection.</p>
        </div>
      );
    }

    const error = presentationError ?? snapshot.error;
    return (
      <section className="terminal-panel" data-phase={snapshot.phase}>
        <div className="terminal-panel__viewport" ref={slotRef} />
        {error !== null ? (
          <div className="terminal-panel__status" role="status">
            {error.message}
          </div>
        ) : snapshot.phase === "exited" ? (
          <div className="terminal-panel__status" role="status">
            Process exited with code {snapshot.exitCode ?? "unknown"}
          </div>
        ) : null}
      </section>
    );
  };
}

export function createTerminalWorkbenchPanelPlugin(
  registry: WorkbenchTerminalSessionRegistry,
) {
  const TerminalPanel = createTerminalPanel(registry);
  return Object.assign(function TerminalWorkbenchPanelPlugin(ctx: Context) {
    const remove = [
      ctx.workbenchPanels.register<{ readonly sessionId: string }>({
        kind: "terminal",
        createTab: ({ sessionId }) => ({
          id: `terminal:${sessionId}`,
          kind: "terminal",
          region: "right",
          title: "Terminal",
          icon: "terminal",
          resource: sessionId,
          closable: true,
          preview: false,
        }),
        disposeTab: (tab) => {
          if (tab.resource !== undefined) registry.release(tab.resource);
        },
      }),
      ctx.workbenchPanelRenderers.register({
        kind: "terminal",
        Component: TerminalPanel,
      }),
      ctx.workbenchPanels.registerToolbarAction({
        id: "vela.terminal.new-session",
        region: "right",
        order: 200,
        label: "New terminal",
        icon: "terminal",
        isAvailable: ({ hostId }) => registry.isAvailable(hostId),
        run: (context) => {
          const sessionId = registry.open({
            hostId: context.hostId,
            cwd: context.cwd,
          });
          ctx.workbenchPanels.open(context.ownerId, "terminal", { sessionId });
        },
      }),
    ];
    ctx.effect(() => () => remove.reverse().forEach((dispose) => dispose()));
  }, {
    inject: ["workbenchPanels", "workbenchPanelRenderers"],
  });
}
