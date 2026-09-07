import type { QueryClient } from "@tanstack/react-query";
import type { ChatMediaSourceLoader } from "@opencraft/chat-render-web";
import type { AppServerWorkbenchRuntime } from "@opencraft/workbench-runtime";

const mimeByExtension: Readonly<Record<string, string>> = Object.freeze({
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
});

export function appServerMediaPath(target: string): string | null {
  if (!target.startsWith("file:")) return null;
  try {
    const url = new URL(target);
    if (url.protocol !== "file:") return null;
    const decoded = decodeURIComponent(url.pathname);
    return /^\/[a-z]:\//iu.test(decoded) ? decoded.slice(1) : decoded;
  } catch {
    return null;
  }
}

export function mediaMimeType(path: string): string {
  const extension = /\.([a-z0-9]+)$/iu.exec(path)?.[1]?.toLowerCase() ?? "";
  return mimeByExtension[extension] ?? "application/octet-stream";
}

/**
 * Codex-equivalent host boundary: React renders media state, TanStack owns
 * deduplication/lifetime, and AppServer remains the only filesystem authority.
 */
export function createAppServerMediaSourceLoader(
  runtime: AppServerWorkbenchRuntime,
  queryClient: QueryClient,
  hostId: string,
): ChatMediaSourceLoader {
  return async ({ resolvedTarget }) => {
    const path = appServerMediaPath(resolvedTarget);
    if (path === null) return null;
    const response = await queryClient.fetchQuery({
      queryKey: ["markdown-media", hostId, path],
      queryFn: () => runtime.resources.fileSystem.readFile(path),
      staleTime: Infinity,
      gcTime: 15_000,
    });
    if (response.dataBase64.length === 0) return null;
    return {
      source: `data:${mediaMimeType(path)};base64,${response.dataBase64}`,
    };
  };
}
