export const THREAD_EDGE_SCROLL_MINIMUM_WIDTH_REM = 96;
export const FALLBACK_ROOT_FONT_SIZE_PX = 16;

export interface ThreadEdgeScrollInput {
  readonly mainContentWidthPx: number;
  readonly leftChromeWidthPx: number;
  readonly rightPanelFullWidth: boolean;
  readonly rootFontSizePx: number;
}

export function resolveThreadEdgeScroll({
  mainContentWidthPx,
  leftChromeWidthPx,
  rightPanelFullWidth,
  rootFontSizePx,
}: ThreadEdgeScrollInput): boolean {
  if (rightPanelFullWidth) return false;
  const safeRootFontSize =
    Number.isFinite(rootFontSizePx) && rootFontSizePx > 0
      ? rootFontSizePx
      : FALLBACK_ROOT_FONT_SIZE_PX;
  // The left navigation is application chrome, not a competing content
  // surface. Opening or resizing it must not switch the conversation between
  // inset and immersive presentation. A real right panel remains part of
  // mainContentWidthPx and can therefore still remove edge-scroll eligibility.
  const conversationEnvelopeWidth =
    Math.max(0, mainContentWidthPx) + Math.max(0, leftChromeWidthPx);
  return (
    conversationEnvelopeWidth >=
    THREAD_EDGE_SCROLL_MINIMUM_WIDTH_REM * safeRootFontSize
  );
}

export function readRootFontSizePx(
  root: Element = document.documentElement,
): number {
  const rootFontSize = Number.parseFloat(getComputedStyle(root).fontSize);
  return Number.isFinite(rootFontSize) && rootFontSize > 0
    ? rootFontSize
    : FALLBACK_ROOT_FONT_SIZE_PX;
}
