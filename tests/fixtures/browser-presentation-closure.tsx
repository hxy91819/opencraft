import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { BrowserViewportMode } from "@opencraft/browser-core";
import { WebIframeSurfaceHost } from "../../apps/workbench-web/src/browser/web-browser-surface-host";
import { WebBrowserPageRuntime } from "../../apps/workbench-web/src/browser/web-browser-runtime";
import { BrowserPresentationCoordinator, type BrowserPresentationHandle } from "../../apps/workbench-web/src/browser/browser-presentation-coordinator";
import { BrowserDeviceToolbar, BrowserDeviceHandles } from "../../apps/workbench-web/src/browser/browser-device-toolbar";
import { buildCodexThemeCssProperties } from "@opencraft/design-system/theme-engine";
import "../../apps/workbench-web/src/styles/app.scss";

const theme = new URLSearchParams(location.search).get("theme") === "dark" ? "dark" : "light";
document.documentElement.dataset.theme = theme;
for (const [key, value] of Object.entries(buildCodexThemeCssProperties(theme))) document.documentElement.style.setProperty(key, value);
const surfaces = new WebIframeSurfaceHost();
surfaces.setRoot(document.getElementById("surfaces"));
const pages = new WebBrowserPageRuntime(surfaces, null, () => null, { getItem: () => null, setItem() {} });
const coordinator = new BrowserPresentationCoordinator(pages, surfaces);
const ids = [pages.create({ ownerId: "fixture" }), pages.create({ ownerId: "fixture" })];

function Demo() {
  const [index, setIndex] = useState(0), [shown, setShown] = useState(true);
  const [mode, setMode] = useState<Exclude<BrowserViewportMode, { type: "responsive" }>>({ type: "device", presetId: "iphone-15-pro", width: 393, height: 852 });
  const [zoom, setZoom] = useState(100);
  const slot = useRef<HTMLDivElement>(null), handle = useRef<BrowserPresentationHandle | null>(null);
  useEffect(() => {
    if (!shown || !slot.current) return;
    const current = coordinator.present({ pageId: ids[index]!, tabId: `tab-${index}` as never,
      viewId: "view", surface: "right-panel", slot: slot.current, viewportMode: mode });
    handle.current = current;
    return () => { handle.current = null; current.dispose(); };
  }, [index, shown]);
  useEffect(() => { handle.current?.updateViewportMode(mode); }, [mode]);
  (window as any).browserClosure = {
    ids, pages, coordinator, setIndex,
    dispose: () => { handle.current?.dispose(); coordinator.dispose(); pages.dispose(); },
  };
  return <main style={{ width: "100%", containerType: "inline-size" }}>
    <div style={{ display: "flex", gap: 12, height: 40 }}>
      <button onClick={() => setIndex(value => 1 - value)}>Switch page</button>
      <button onClick={() => setShown(value => !value)}>{shown ? "Hide page" : "Show page"}</button>
      <output id="logical-size">{mode.width} × {mode.height}</output>
    </div>
    <BrowserDeviceToolbar mode={mode} onChange={setMode} onClose={() => setShown(false)} zoom={zoom} onZoom={setZoom} />
    <div ref={slot} className="browser-viewport-slot" data-viewport-mode="device" style={{ height: 680 }}>
      <BrowserDeviceHandles slot={slot} mode={mode} onChange={setMode} />
    </div>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Demo />);
