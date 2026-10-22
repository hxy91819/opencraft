import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import "./liquid-glass.web.scss";

/** A live backdrop, never a screenshot of content. The lens map is rebuilt only
 * when geometry changes; the browser composites scrolling content underneath. */
export function LiquidGlassBackdrop() {
  const id = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ref = useRef<HTMLSpanElement>(null);
  const [map, setMap] = useState<{ href: string; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !CSS.supports("backdrop-filter", 'url("#lens")')) return;
    const observer = new ResizeObserver(() => {
      const width = Math.round(element.clientWidth), height = Math.round(element.clientHeight);
      if (width < 1 || height < 1) return;
      // Small chrome needs no device-scale texture or animation-frame work.
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      const pixels = context.createImageData(width, height);
      const radius = height / 2, halfLine = Math.max(0, width / 2 - radius);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const dx = x - Math.max(width / 2 - halfLine, Math.min(width / 2 + halfLine, x));
        const dy = y - height / 2, length = Math.hypot(dx, dy);
        const edge = Math.max(0, radius - length);
        const bend = Math.exp(-edge / 3) * Math.min(1, edge / 1.2);
        const i = (y * width + x) * 4;
        pixels.data[i] = 128 - 127 * dx / (length || 1) * bend;
        pixels.data[i + 1] = 128 - 127 * dy / (length || 1) * bend;
        pixels.data[i + 2] = 128; pixels.data[i + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
      setMap({ href: canvas.toDataURL(), width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} aria-hidden="true" className="ui-liquid-glass"
    style={map ? { "--material-liquid-lens": `url("#${id}") blur(2px) saturate(1.25)` } as CSSProperties : undefined}>
    {map ? <svg className="ui-liquid-glass__filters" width="0" height="0" focusable="false">
      <defs><filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={map.href} width={map.width} height={map.height} result="lens-map" preserveAspectRatio="none" />
        <feDisplacementMap in="SourceGraphic" in2="lens-map" scale="12" xChannelSelector="R" yChannelSelector="G" />
      </filter></defs>
    </svg> : null}
  </span>;
}
