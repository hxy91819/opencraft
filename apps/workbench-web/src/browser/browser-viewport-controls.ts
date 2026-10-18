export type ResizeEdge = "left" | "right" | "bottom" | "bottom-left" | "bottom-right";
export const viewportDimension = (value: number, axis: "width" | "height") =>
  Math.round(Math.max(axis === "width" ? 240 : 160, Math.min(4096, value)));

// Device names and physical viewport dimensions are factual preset data.
export const DEVICE_PRESETS = [
  { id: "responsive", label: "Responsive", width: 390, height: 844 },
  { id: "4k", label: "4K", width: 2560, height: 1440 },
  { id: "laptop-l", label: "Laptop L", width: 1440, height: 900 },
  { id: "laptop", label: "Laptop", width: 1024, height: 768 },
  { id: "surface-pro-7", label: "Surface Pro 7", width: 912, height: 1368 },
  { id: "ipad-air", label: "iPad Air", width: 820, height: 1180 },
  { id: "ipad-mini", label: "iPad Mini", width: 768, height: 1024 },
  { id: "surface-duo", label: "Surface Duo", width: 540, height: 720 },
  { id: "iphone-15-pro-max", label: "iPhone 15 Pro Max", width: 430, height: 932 },
  { id: "pixel-8", label: "Pixel 8", width: 412, height: 915 },
  { id: "iphone-15-pro", label: "iPhone 15 Pro", width: 393, height: 852 },
  { id: "samsung-galaxy-s24-ultra", label: "Galaxy S24 Ultra", width: 384, height: 824 },
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667 },
] as const;

interface ResizeInput {
  readonly drag: { readonly edge: ResizeEdge; readonly startWidth: number; readonly startHeight: number;
    readonly startPointerX: number; readonly startPointerY: number };
  readonly pointerX: number;
  readonly pointerY: number;
  readonly scale: number;
  readonly fitWidth: number;
  readonly fitHeight: number;
}

/** Horizontal viewports stay centered, so an edge moves half their width.
 * Vertical viewports are top-aligned. Fit limits are measured in screen pixels;
 * dimensions are persisted in logical pixels. */
export function computeDragResizeDimensions(input: ResizeInput): { width: number; height: number } {
  const { drag, scale } = input;
  const result = { width: drag.startWidth, height: drag.startHeight };
  if (!Number.isFinite(scale) || scale <= 0) return result;
  const axes = [
    { axis: "width", active: drag.edge !== "bottom", pixels: input.pointerX - drag.startPointerX,
      direction: drag.edge.includes("left") ? -2 : 2, fit: input.fitWidth },
    { axis: "height", active: drag.edge.includes("bottom"), pixels: input.pointerY - drag.startPointerY,
      direction: 1, fit: input.fitHeight },
  ] as const;
  for (const { axis, active, pixels, direction, fit } of axes) {
    if (!active || !Number.isFinite(pixels)) continue;
    const requested = result[axis] + pixels / scale * direction;
    const maximum = fit > 0 ? fit / scale : Infinity;
    result[axis] = viewportDimension(Math.min(requested, maximum), axis);
  }
  return result;
}
