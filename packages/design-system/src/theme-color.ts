type Color = readonly [number, number, number];

export function parseColor(hex: string): Color {
  if (!/^#[0-9a-f]{6}$/iu.test(hex)) throw new TypeError("Expected a six-digit theme color");
  return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16)) as unknown as Color;
}

export function mixColor(from: string, to: string, amount: number): string {
  const a = parseColor(from), b = parseColor(to);
  const weight = Math.min(1, Math.max(0, amount));
  return "#" + a.map((value, index) => Math.round(value + (b[index]! - value) * weight)
    .toString(16).padStart(2, "0")).join("");
}

export function alphaColor(hex: string, opacity: number): string {
  return `rgba(${parseColor(hex).join(", ")}, ${Math.min(1, Math.max(0, opacity))})`;
}

export function rgbColor(hex: string): string { return `rgb(${parseColor(hex).join(", ")})`; }

function luminance(hex: string): number {
  const channels = parseColor(hex).map(value => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

export function colorContrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function readableText(background: string, preferred: string): string {
  if (colorContrast(background, preferred) >= 4.5) return preferred;
  // Preserve hue as far as possible; one endpoint must satisfy this threshold.
  const target = colorContrast(background, "#000000") >= colorContrast(background, "#ffffff")
    ? "#000000" : "#ffffff";
  for (let step = 1; step <= 20; step++) {
    const candidate = mixColor(preferred, target, step / 20);
    if (colorContrast(background, candidate) >= 4.5) return candidate;
  }
  return target;
}
