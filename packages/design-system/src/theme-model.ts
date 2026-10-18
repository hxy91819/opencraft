import type { ThemeMaterialOptions, ThemeSurfaceOverrides } from "./theme-options";

export type ThemeMode = "light" | "dark";
export type ThemeCssProperties = Record<`--${string}`, string>;
export interface RgbColor { red: number; green: number; blue: number }
export interface ThemeDefinition {
  accent: string;
  ink: string;
  surface: string;
  contrast: number;
  fonts: { code: string | null; ui: string | null };
  opaqueWindows: boolean;
  surfaces?: ThemeSurfaceOverrides;
  material?: ThemeMaterialOptions;
  semanticColors: {
    diffAdded: string; diffRemoved: string; skill: string;
    warning?: string; error?: string; success?: string;
  };
  /** Trusted built-in data; extension registration does not expose CSS fields. */
  shellMaterial?: {
    mainSurfaceElevation: string; sidebarBackground: string; sidebarFilter: string;
    windowHighlight: string; windowMaterial: string;
  };
}

/** Legacy type names remain available while consumers migrate. */
export type CodexThemeDefinition = ThemeDefinition;
export type CodexThemeMode = ThemeMode;
