import { codexThemePalette } from "./theme-presets";
import { projectTheme } from "./theme-projection";
import type { ThemeDefinition, ThemeMode } from "./theme-model";

export type { RgbColor, ThemeDefinition, ThemeMode, ThemeCssProperties, CodexThemeDefinition, CodexThemeMode } from "./theme-model";
export { codexThemePalette, velaThemePalette, frostThemePalette, lavenderThemePalette, zenCodeThemePalette, mistThemePalette } from "./theme-presets";

export function buildThemeCssProperties(mode: ThemeMode, definition: ThemeDefinition = codexThemePalette[mode]) {
  return projectTheme(mode, definition);
}

/** Compatibility entry; the projection implementation is independently authored. */
export const buildCodexThemeCssProperties = buildThemeCssProperties;
