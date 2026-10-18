import { alphaColor, colorContrast, mixColor, parseColor, readableText, rgbColor } from "./theme-color";
import { validateThemeOptions } from "./theme-options";
import type { ThemeCssProperties, ThemeDefinition, ThemeMode } from "./theme-model";
import { clientShellMaterial } from "./theme-presets";

/** Pure semantic role projection. Selection, DOM writes and fonts have separate owners. */
export function projectTheme(mode: ThemeMode, definition: ThemeDefinition): ThemeCssProperties {
  if (mode !== "light" && mode !== "dark") throw new TypeError("Invalid resolved theme mode");
  validateThemeOptions(definition.surfaces, definition.material);
  for (const value of [definition.accent, definition.ink, definition.surface, ...Object.values(definition.semanticColors)]) {
    if (value !== undefined) parseColor(value);
  }
  if (!Number.isFinite(definition.contrast)) throw new TypeError("Theme contrast must be finite");
  const dark = mode === "dark";
  const { accent, ink, surface, semanticColors: semantic, shellMaterial: shell } = definition;
  const preference = Math.min(100, Math.max(0, definition.contrast)) / 100;
  const surfaces = definition.surfaces ?? {};
  const opaque = definition.material?.window === undefined ? definition.opaqueWindows : definition.material.window === "opaque";
  const resetMaterial = definition.material?.window !== undefined || (opaque && !shell);
  const material = resetMaterial
    ? { ...clientShellMaterial, sidebarBackground: opaque ? surface : clientShellMaterial.sidebarBackground,
        sidebarFilter: opaque ? "none" : clientShellMaterial.sidebarFilter,
        windowHighlight: opaque ? "none" : clientShellMaterial.windowHighlight,
        windowMaterial: opaque ? surface : clientShellMaterial.windowMaterial }
    : shell ?? clientShellMaterial;
  const window = surfaces.window ?? material.windowMaterial;
  const panel = surfaces.panel ?? surface;
  const input = surfaces.input ?? mixColor(panel, ink, dark ? 0.045 : 0.015);
  const popover = surfaces.popover ?? mixColor(panel, "#ffffff", dark ? 0.07 : 0.6);
  const secondarySurface = mixColor(panel, ink, 0.045);
  const strongForeground = ink;
  const focus = alphaColor(dark ? "#ffffff" : "#000000", 0.72);
  const primary = ink;
  const primaryText = colorOn(primary);
  const primaryState = (amount: number) => {
    const color = mixColor(primary, primaryText, amount);
    return rgbColor(colorContrast(color, primaryText) >= 4.5 ? color : primary);
  };
  const fade = (opacity: number) => alphaColor(ink, opacity);
  const border = fade(0.08 + preference * 0.06);
  const css: ThemeCssProperties = {};
  const put = (key: string, value: string) => { css[`--${key}`] = value; };
  for (const [name, value] of Object.entries({
    "codex-base-accent": accent, "codex-base-ink": ink, "codex-base-surface": surface,
    "codex-base-contrast": String(definition.contrast), "codex-window-material": window,
    "codex-window-highlight": material.windowHighlight,
    "codex-main-surface-elevation": definition.material?.elevation === "flat" ? "none"
      : definition.material?.elevation === "soft" ? clientShellMaterial.mainSurfaceElevation : material.mainSurfaceElevation,
    "codex-sidebar-material-background": surfaces.sidebar ?? material.sidebarBackground,
    "codex-sidebar-material-filter": material.sidebarFilter,
    "color-background-surface": surface, "color-background-surface-under": secondarySurface,
    "color-background-panel": panel, "color-background-input": input,
    "color-background-elevated-primary": surfaces.popover ?? alphaColor(popover, 0.96), "color-background-elevated-primary-opaque": popover,
    "color-background-elevated-secondary": alphaColor(secondarySurface, 0.96), "color-background-elevated-secondary-opaque": secondarySurface,
    "color-background-application-menu": popover, "color-background-editor-opaque": input,
    "color-background-control": surfaces.input ?? alphaColor(input, 0.96), "color-background-control-opaque": input,
    "color-background-composer-rail": alphaColor(popover, 0.94), "color-background-composer-rail-opaque": popover,
    "color-border-composer-rail": border,
    "color-background-primary-ghost-hover": fade(0.06),
    "color-accent-blue": accent, "color-accent-purple": semantic.skill,
    "color-decoration-added": semantic.diffAdded, "color-decoration-deleted": semantic.diffRemoved,
    "color-text-warning": semantic.warning ?? (dark ? "#efb16a" : "#935511"),
    "color-text-danger": semantic.error ?? (dark ? "#ff9993" : "#b72d38"),
    "color-status-success": semantic.success ?? (dark ? "#8cd7aa" : "#246f40"),
    "color-text-working-highlight": ink, "color-text-on-accent": colorOn(accent),
    "color-text-accent": accent, "color-icon-accent": accent,
    "color-text-button-primary": primaryText,
    "color-background-button-primary": primary,
    "color-background-button-primary-hover": primaryState(0.14),
    "color-background-button-primary-active": primaryState(0.22),
    "color-background-button-primary-inactive": fade(0.2),
    "color-text-button-secondary": strongForeground, "color-text-button-tertiary": strongForeground,
    "color-background-button-secondary": fade(0.06), "color-background-button-secondary-hover": fade(0.1),
    "color-background-button-secondary-active": fade(0.16), "color-background-button-secondary-inactive": fade(0.035),
    "color-background-button-tertiary": "transparent", "color-background-button-tertiary-hover": fade(0.08),
    "color-background-button-tertiary-active": fade(0.14),
    "color-background-navigation-hover": fade(0.045), "color-background-navigation-current": fade(0.09),
    "color-background-navigation-pressed": fade(0.15),
    "color-background-accent": mixColor(panel, accent, 0.1), "color-background-accent-hover": mixColor(panel, accent, 0.14),
    "color-background-accent-active": mixColor(panel, accent, 0.18),
    "color-usage-track": fade(0.09), "color-dialog-scrim": alphaColor("#000000", dark ? 0.55 : 0.32),
    "color-simple-scrim": alphaColor("#000000", dark ? 0.4 : 0.2),
    "elevation-dialog-utility": dark ? "0 12px 32px rgba(0, 0, 0, 0.4)" : "0 10px 30px rgba(0, 0, 0, 0.14)",
    "color-border-focus": focus, "color-focus-ring": focus, "focus-ring": focus,
  })) put(name, value);
  for (const [name, value] of Object.entries({
    "color-text": strongForeground, "color-text-foreground": strongForeground, "color-icon-primary": strongForeground,
    "color-text-secondary": fade(0.7), "color-text-foreground-secondary": fade(0.7), "color-icon-secondary": fade(0.7),
    "color-text-tertiary": fade(0.5), "color-text-foreground-tertiary": fade(0.5), "color-icon-tertiary": fade(0.5),
    "color-surface": surface, "color-surface-secondary": secondarySurface, "color-surface-tertiary": input,
    "color-border": border, "color-border-default": border, "color-border-light": fade(0.05),
    "color-border-subtle": fade(0.07), "color-border-heavy": fade(0.2), "color-border-strong": fade(0.24),
  })) put(name, value);
  const tones = { blue: "#3678d4", cyan: "#157d91", red: "#c34450", indigo: "#6456ba",
    green: "#287d47", purple: "#8b52b7", orange: "#a56522", neutral: "#68717a" };
  for (const [name, color] of Object.entries(tones)) {
    const background = mixColor(panel, color, 0.12);
    put(`color-badge-${name}-background`, background);
    put(`color-badge-${name}-foreground`, readableText(background, color));
  }
  return css;
}

function colorOn(background: string): string {
  // Primary actions use the reverse base surface for the established light/dark pair.
  if (colorContrast(background, "#ffffff") >= 4.5) return "#ffffff";
  if (colorContrast(background, "#181818") >= 4.5) return "#181818";
  return "#000000";
}
