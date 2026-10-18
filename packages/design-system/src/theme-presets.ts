import type { ThemeDefinition, ThemeMode } from "./theme-model";

// Existing palette and material input data retained; see THEME_PROVENANCE.md.
export const clientShellMaterial = Object.freeze({
  mainSurfaceElevation: "var(--elevation-prominent)",
  sidebarBackground: "color-mix(in srgb, var(--color-surface-tertiary) 70%, transparent)",
  sidebarFilter: "blur(28px) saturate(145%)",
  windowHighlight: "radial-gradient(circle at 12% -8%, color-mix(in srgb, var(--color-surface-tertiary) 72%, transparent), transparent 34%)",
  windowMaterial: "color-mix(in srgb, var(--color-background-surface-under) 92%, var(--color-text) 8%)",
});

export const codexThemePalette: Record<ThemeMode, ThemeDefinition> = {
  dark: {
    accent: "#339cff",
    contrast: 60,
    fonts: { code: null, ui: null },
    ink: "#ffffff",
    opaqueWindows: false,
    semanticColors: { diffAdded: "#40c977", diffRemoved: "#fa423e", skill: "#ad7bf9" },
    surface: "#181818",
  },
  light: {
    accent: "#339cff",
    contrast: 45,
    fonts: { code: null, ui: null },
    ink: "#1a1c1f",
    opaqueWindows: false,
    semanticColors: { diffAdded: "#00a240", diffRemoved: "#ba2623", skill: "#924ff7" },
    surface: "#ffffff",
  },
};

export const velaThemePalette: Record<ThemeMode, ThemeDefinition> = {
  dark: {
    accent: "#7698ff",
    contrast: 54,
    fonts: { code: null, ui: null },
    ink: "#f2f2f2",
    opaqueWindows: true,
    shellMaterial: {
      mainSurfaceElevation: "-0.5px 0 0 rgb(255 255 255 / 7%)",
      sidebarBackground: "#171717",
      sidebarFilter: "none",
      windowHighlight: "none",
      windowMaterial: "#171717",
    },
    semanticColors: { diffAdded: "#40c977", diffRemoved: "#fa625e", skill: "#b693ef" },
    surface: "#171717",
  },
  light: {
    accent: "#285dff",
    contrast: 42,
    fonts: { code: null, ui: null },
    ink: "#171717",
    opaqueWindows: true,
    shellMaterial: {
      mainSurfaceElevation: "-0.5px 0 0 rgb(0 0 0 / 5%)",
      sidebarBackground: "#ffffff",
      sidebarFilter: "none",
      windowHighlight: "none",
      windowMaterial: "#ffffff",
    },
    semanticColors: { diffAdded: "#07c160", diffRemoved: "#cf3d4c", skill: "#7b61ff" },
    surface: "#ffffff",
  },
};

/**
 * Frost owns its material constants. The 35% Sidebar alpha is intentionally
 * not derived from Codex's 70% material so the themes can evolve independently.
 */
export const frostThemePalette: Record<ThemeMode, ThemeDefinition> = {
  dark: {
    accent: "#66a9ff",
    contrast: 56,
    fonts: { code: null, ui: null },
    ink: "#eef8fb",
    opaqueWindows: false,
    shellMaterial: {
      mainSurfaceElevation: "var(--elevation-prominent)",
      sidebarBackground: "rgb(20 37 46 / 35%)",
      sidebarFilter: "blur(28px) saturate(145%)",
      windowHighlight: "none",
      windowMaterial: "#10191e",
    },
    semanticColors: { diffAdded: "#53c987", diffRemoved: "#ff7b75", skill: "#bca0f5" },
    surface: "#152129",
  },
  light: {
    accent: "#287ee8",
    contrast: 43,
    fonts: { code: null, ui: null },
    ink: "#182126",
    opaqueWindows: false,
    shellMaterial: {
      mainSurfaceElevation: "var(--elevation-prominent)",
      sidebarBackground: "rgb(226 244 250 / 35%)",
      sidebarFilter: "blur(28px) saturate(145%)",
      windowHighlight: "none",
      windowMaterial: "#f4f8fa",
    },
    semanticColors: { diffAdded: "#13834d", diffRemoved: "#c73d3a", skill: "#7956c8" },
    surface: "#ffffff",
  },
};

/**
 * LightVela's restrained lavender language projected through the shared
 * Workbench theme contract. The palette changes color and material only;
 * typography, density and geometry remain owned by the Design System.
 */
export const lavenderThemePalette: Record<ThemeMode, ThemeDefinition> = {
  dark: {
    accent: "#b09afc",
    contrast: 56,
    fonts: { code: null, ui: null },
    ink: "#f1edf8",
    opaqueWindows: true,
    material: { window: "opaque", elevation: "soft" },
    surfaces: {
      window: "#17141f",
      sidebar: "#1d1828",
      panel: "#221d2e",
      input: "#2a2338",
      popover: "#2d263b",
    },
    semanticColors: {
      diffAdded: "#61c58a",
      diffRemoved: "#ff817b",
      skill: "#c2adff",
      warning: "#f4b36e",
      error: "#ff9993",
      success: "#8bd9a9",
    },
    surface: "#17141f",
  },
  light: {
    accent: "#6d5ce7",
    contrast: 44,
    fonts: { code: null, ui: null },
    ink: "#211d2b",
    opaqueWindows: true,
    material: { window: "opaque", elevation: "soft" },
    surfaces: {
      window: "#f8f6ff",
      sidebar: "#f1ecff",
      panel: "#ffffff",
      input: "#f7f4ff",
      popover: "#ffffff",
    },
    semanticColors: {
      diffAdded: "#18844e",
      diffRemoved: "#c6404c",
      skill: "#8063dc",
      warning: "#995d16",
      error: "#b82f3d",
      success: "#247648",
    },
    surface: "#f8f6ff",
  },
};

/** Close neutral surfaces keep navigation and conversation on one quiet canvas. */
export const mistThemePalette: Record<ThemeMode, ThemeDefinition> = {
  light: {
    accent: "#7062cc",
    contrast: 44,
    fonts: { code: null, ui: null },
    ink: "#25272d",
    surface: "#fbfcfd",
    opaqueWindows: true,
    material: { window: "opaque", elevation: "flat" },
    surfaces: {
      window: "#fbfcfd", sidebar: "#f6f7f9", panel: "#fbfcfd",
      input: "#ffffff", popover: "#ffffff",
    },
    semanticColors: {
      diffAdded: "#21834f", diffRemoved: "#c34250", skill: "#7062cc",
      warning: "#946014", error: "#ba3545", success: "#24794b",
    },
  },
  dark: {
    accent: "#afa1f1",
    contrast: 55,
    fonts: { code: null, ui: null },
    ink: "#eceef2",
    surface: "#1d1f24",
    opaqueWindows: true,
    material: { window: "opaque", elevation: "flat" },
    surfaces: {
      window: "#1d1f24", sidebar: "#191b20", panel: "#1d1f24",
      input: "#272930", popover: "#2b2d35",
    },
    semanticColors: {
      diffAdded: "#66c58c", diffRemoved: "#f7808c", skill: "#afa1f1",
      warning: "#e4b66f", error: "#ff9ba6", success: "#8bd5a9",
    },
  },
};

/** ZCode-inspired surface hierarchy, expressed through OpenCraft's own theme contract. */
export const zenCodeThemePalette: Record<ThemeMode, ThemeDefinition> = {
  light: {
    accent: "#0b7fff",
    contrast: 45,
    fonts: { code: null, ui: null },
    ink: "#262626",
    surface: "#f8f8f8",
    opaqueWindows: true,
    material: { window: "opaque", elevation: "flat" },
    surfaces: {
      window: "#f8f8f8", sidebar: "#f0f0f0", panel: "#ffffff",
      input: "#ffffff", popover: "#ffffff",
    },
    semanticColors: {
      diffAdded: "#1e8a3e", diffRemoved: "#e03131", skill: "#7956b8",
      warning: "#995200", error: "#b42318", success: "#1e783a",
    },
  },
  dark: {
    accent: "#4099ff",
    contrast: 55,
    fonts: { code: null, ui: null },
    ink: "#d4d4d4",
    surface: "#161616",
    opaqueWindows: true,
    material: { window: "opaque", elevation: "flat" },
    surfaces: {
      window: "#161616", sidebar: "#161616", panel: "#202020",
      input: "#2b2b2b", popover: "#2b2b2b",
    },
    semanticColors: {
      diffAdded: "#46bf72", diffRemoved: "#ff5c5c", skill: "#b69bf2",
      warning: "#ffb26b", error: "#ff9999", success: "#87d9a4",
    },
  },
};
