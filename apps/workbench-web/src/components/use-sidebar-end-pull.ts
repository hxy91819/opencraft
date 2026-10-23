import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/** Reveal one page when scrolling reaches the end, without owning pagination.
 * Scroll movement, rather than visibility, avoids draining short lists on mount/resize.
 * Passive listeners leave native vertical scrolling and horizontal Shell gestures intact.
 */
export function useSidebarEndPull(footerRef: RefObject<HTMLDivElement | null>, enabled: boolean, reveal: () => void) {
  const action = useRef({ enabled, reveal });
  useLayoutEffect(() => { action.current = { enabled, reveal }; });
  useEffect(() => {
    const footer = footerRef.current;
    const panel = footer?.closest<HTMLElement>(".sidebar-panel");
    if (!footer || !panel) return;
    const column = panel.closest(".shell-sidebar__column");
    const target = column?.querySelector<HTMLElement>(".shell-sidebar__scroll") ?? panel;
    let touch: { x: number; y: number } | null = null;
    let downward = false;
    let consumed = false;
    const viewport = () => column?.getAttribute("data-navigation-layout") === "mobile"
      ? target : panel.querySelector<HTMLElement>(column ? ".sidebar-activity-list" : ".sidebar-content-scroll");
    let lastViewport = viewport();
    let lastScrollTop = lastViewport?.scrollTop ?? 0;
    const atEnd = () => {
      const root = viewport();
      if (!root || !root.clientHeight || footer.closest('[inert], [aria-hidden="true"]')) return false;
      const bounds = root.getBoundingClientRect();
      const end = footer.getBoundingClientRect();
      return end.height > 0 && end.top < bounds.bottom && end.bottom > bounds.top
        && root.scrollHeight - root.scrollTop - root.clientHeight <= 2;
    };
    const tryReveal = () => {
      if (!downward || consumed || !action.current.enabled || !atEnd()) return;
      consumed = true;
      downward = false;
      action.current.reveal();
    };
    const scroll = (event: Event) => {
      const root = viewport();
      if (!root || event.target !== root) return;
      const previous = root === lastViewport ? lastScrollTop : root.scrollTop;
      lastViewport = root;
      lastScrollTop = root.scrollTop;
      if (root.scrollTop <= previous) return;
      // Scrollbar drags, keyboard navigation and touch momentum all arrive here.
      // A held touch still consumes at most one page, including its final scroll.
      if (!touch) consumed = false;
      downward = true;
      tryReveal();
    };
    const withinList = (event: Event) => event.target instanceof Node
      && (event.target === viewport() || panel.querySelector(".sidebar-activity-list")?.contains(event.target));
    const wheel = (event: WheelEvent) => {
      if (!withinList(event)) return;
      downward = event.deltaY > 0 && Math.abs(event.deltaY) > Math.abs(event.deltaX);
      // New rows move the end away. Continued scrolling can then arm the next page.
      if (!atEnd()) consumed = false;
      tryReveal();
    };
    const start = (event: TouchEvent) => {
      const point = event.touches.length === 1 && withinList(event) ? event.touches[0] : null;
      touch = point ? { x: point.clientX, y: point.clientY } : null;
      downward = false;
      consumed = false;
    };
    const move = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) { downward = false; return; }
      const point = event.touches[0]!;
      const dy = touch.y - point.clientY;
      downward = dy > 8 && dy > Math.abs(touch.x - point.clientX);
      tryReveal();
    };
    const end = () => { touch = null; downward = false; };
    target.addEventListener("scroll", scroll, { capture: true, passive: true });
    target.addEventListener("wheel", wheel, { passive: true });
    target.addEventListener("touchstart", start, { passive: true });
    target.addEventListener("touchmove", move, { passive: true });
    target.addEventListener("touchend", end, { passive: true });
    target.addEventListener("touchcancel", end, { passive: true });
    return () => {
      target.removeEventListener("scroll", scroll, true);
      target.removeEventListener("wheel", wheel);
      target.removeEventListener("touchstart", start);
      target.removeEventListener("touchmove", move);
      target.removeEventListener("touchend", end);
      target.removeEventListener("touchcancel", end);
    };
  }, [footerRef]);
}
