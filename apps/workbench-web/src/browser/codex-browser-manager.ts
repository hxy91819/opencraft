import { BrowserPresentationManager } from "./browser-presentation-manager";
import type { CodexPresentationHost } from "./codex-presentation-host";

// Retain the existing internal factory name while callers migrate together.
export function createCodexBrowserManager(Host: new (options: Record<string, any>) => CodexPresentationHost) {
  return new BrowserPresentationManager(Host);
}
