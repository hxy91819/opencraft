import type { WebPreviewDocument } from "@opencraft/file-preview-web";
import { validateOfficeArchive } from "./archive";
import "./preview.web.scss";

export async function openOfficeDocument(input: { blob: Blob; name: string; signal: AbortSignal }): Promise<WebPreviewDocument> {
  const buffer = await input.blob.arrayBuffer();
  input.signal.throwIfAborted();
  const kind = input.name.split(".").at(-1)!.toLowerCase();
  if (kind === "xls") {
    const bytes = new Uint8Array(buffer);
    const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    if (!signature.every((value, index) => bytes[index] === value)) throw new Error("Not a legacy Excel workbook");
  } else validateOfficeArchive(buffer, kind);
  input.signal.throwIfAborted();
  if (kind === "xlsx" || kind === "xls" || kind === "xlsm") {
    const { openSpreadsheet } = await import("./spreadsheet");
    input.signal.throwIfAborted();
    return openSpreadsheet(buffer, input.name, input.signal);
  }
  const element = document.createElement("div");
  element.className = `office-preview office-preview--${kind}`;
  // Imported document links must not navigate or replace the Workbench.
  element.addEventListener("click", event => {
    if ((event.target as Element).closest("a")) event.preventDefault();
  });
  let disposed = false;
  const cleanups: Array<() => void> = [];
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const cleanup of cleanups.reverse()) cleanup();
    element.remove(); element.replaceChildren();
  };
  try {
    if (kind === "docx") {
      const { renderAsync } = await import("docx-preview");
      input.signal.throwIfAborted();
      const style = document.createElement("div");
      const content = document.createElement("div");
      content.className = "office-preview__pages";
      content.style.color = "#000"; content.style.colorScheme = "light";
      element.append(style, content);
      const className = `office-docx-${crypto.randomUUID()}`;
      // This engine cannot physically cancel parsing. Its detached container
      // is published only if this attempt still owns the result.
      await renderAsync(buffer, content, style, { className, breakPages: true, inWrapper: true,
        ignoreWidth: false, ignoreHeight: false, ignoreLastRenderedPageBreak: true,
        renderAltChunks: false, renderComments: false, renderChanges: false, useBase64URL: true });
      input.signal.throwIfAborted();
      const pages = content.querySelector<HTMLElement>(`.${className}-wrapper`);
      if (pages) { pages.style.padding = "0"; pages.style.background = "transparent"; pages.style.width = "max-content"; }
      const fit = () => {
        if (disposed || element.clientWidth === 0 || !pages) return;
        const scale = Math.min(1, Math.max(0.05, (element.clientWidth - 24) / pages.offsetWidth));
        pages.style.transformOrigin = "top left";
        pages.style.transform = `scale(${scale})`;
        content.style.width = `${pages.offsetWidth * scale}px`;
        content.style.height = `${pages.offsetHeight * scale}px`;
      };
      const observer = new ResizeObserver(fit);
      observer.observe(element); if (pages) observer.observe(pages);
      cleanups.push(() => observer.disconnect());
      return { element, dispose, setActive: active => { if (active) fit(); } };
    }
    const { PptxViewer, RECOMMENDED_ZIP_LIMITS } = await import("@aiden0z/pptx-renderer/browser");
    input.signal.throwIfAborted();
    const viewer = new PptxViewer(element, { fitMode: "contain", scrollContainer: element, pdfjs: false,
      zipLimits: { ...RECOMMENDED_ZIP_LIMITS, maxTotalUncompressedBytes: 64 * 1024 * 1024, maxEntryUncompressedBytes: 32 * 1024 * 1024 } });
    cleanups.push(() => viewer.destroy());
    await viewer.open(buffer, { renderMode: "list", lazyMedia: true, lazySlides: true, signal: input.signal });
    input.signal.throwIfAborted();
    return { element, dispose, setActive: active => { if (active) void viewer.setFitMode("contain").catch(() => undefined); } };
  } catch (error) { dispose(); throw error; }
}
