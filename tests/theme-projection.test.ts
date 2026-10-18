import assert from "node:assert/strict";
import test from "node:test";
import { alphaColor, colorContrast, mixColor, parseColor } from "../packages/design-system/src/theme-color";
import { buildThemeCssProperties, codexThemePalette, frostThemePalette, lavenderThemePalette,
  mistThemePalette, velaThemePalette, zenCodeThemePalette } from "@opencraft/design-system/theme-engine";

test("color operations reject CSS, preserve endpoints and keep finite bounded components", () => {
  assert.deepEqual(parseColor("#0033fF"), [0, 51, 255]);
  for (const value of ["red", "#123", "url(example)", "#gg0000", "#ffffff;display:none"]) {
    assert.throws(() => parseColor(value), TypeError);
  }
  assert.equal(mixColor("#000000", "#ffffff", 0), "#000000");
  assert.equal(mixColor("#000000", "#ffffff", 1), "#ffffff");
  assert.equal(mixColor("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mixColor("#000000", "#ffffff", -1), "#000000");
  assert.equal(alphaColor("#0033ff", 2), "rgba(0, 51, 255, 1)");
  assert.equal(colorContrast("#000000", "#ffffff"), 21);
});

test("every palette projects independent maps without mutating the input or supplying geometry", () => {
  for (const palette of [codexThemePalette, frostThemePalette, lavenderThemePalette, mistThemePalette, velaThemePalette, zenCodeThemePalette]) {
    for (const mode of ["light", "dark"] as const) {
      const before = JSON.stringify(palette[mode]);
      const a = buildThemeCssProperties(mode, palette[mode]);
      const b = buildThemeCssProperties(mode, palette[mode]);
      assert.deepEqual(a, b); assert.notEqual(a, b);
      assert.equal(JSON.stringify(palette[mode]), before);
      assert.ok(Object.keys(a).every(key => !/height|width|font-size|padding|margin/.test(key)));
      a["--color-background-panel"] = "#123456";
      assert.notEqual(b["--color-background-panel"], "#123456");
    }
  }
});

test("brand changes cannot alter badge identity or neutral keyboard focus", () => {
  for (const mode of ["light", "dark"] as const) {
    for (const panel of ["#000000", "#ffffff", "#777777", "#112b7f", "#cf293c"]) {
      const a = buildThemeCssProperties(mode, { ...codexThemePalette[mode], surfaces: { panel } });
      const b = buildThemeCssProperties(mode, { ...codexThemePalette[mode], accent: "#ff2299", surfaces: { panel } });
      assert.equal(a["--color-border-focus"], b["--color-border-focus"]);
      for (const tone of ["blue", "cyan", "red", "indigo", "green", "purple", "orange", "neutral"]) {
        const foreground = `--color-badge-${tone}-foreground` as const;
        const background = `--color-badge-${tone}-background` as const;
        assert.equal(a[foreground], b[foreground]); assert.equal(a[background], b[background]);
        assert.ok(colorContrast(a[foreground]!, a[background]!) >= 4.5);
      }
    }
  }
});

test("surface and material validation rejects executable CSS and non-finite preference", () => {
  for (const definition of [
    { ...codexThemePalette.light, accent: "var(--external)" },
    { ...codexThemePalette.light, contrast: Number.NaN },
    { ...codexThemePalette.light, surfaces: { panel: "url(example)" } },
  ]) assert.throws(() => buildThemeCssProperties("light", definition), TypeError);
  const configured = buildThemeCssProperties("light", { ...codexThemePalette.light,
    surfaces: { panel: "#123456" }, material: { elevation: "flat" } });
  assert.equal(configured["--color-background-panel"], "#123456");
  assert.equal(configured["--codex-main-surface-elevation"], "none");
  assert.notEqual(buildThemeCssProperties("light")["--color-background-panel"], "#123456");
});

test("primary actions retain readable foregrounds through hover and pressed states", () => {
  const hex = (value: string) => value.startsWith("#") ? value : "#" + value.match(/\d+/gu)!
    .map(channel => Number(channel).toString(16).padStart(2, "0")).join("");
  for (const mode of ["light", "dark"] as const) {
    for (const ink of [codexThemePalette[mode].ink, "#777777", "#1257af", "#ace092"]) {
      const css = buildThemeCssProperties(mode, { ...codexThemePalette[mode], ink });
      for (const state of ["", "-hover", "-active"]) {
        assert.ok(colorContrast(hex(css[`--color-background-button-primary${state}`]!),
          hex(css["--color-text-button-primary"]!)) >= 4.5, `${mode}/${ink}/${state}`);
      }
    }
  }
});

test("material overrides reset trusted shell effects without leaking into other calls", () => {
  const base = frostThemePalette.light;
  const opaque = buildThemeCssProperties("light", { ...base, material: { window: "opaque" } });
  assert.equal(opaque["--codex-sidebar-material-filter"], "none");
  assert.equal(opaque["--codex-window-highlight"], "none");
  assert.equal(opaque["--codex-window-material"], base.surface);
  assert.equal(opaque["--codex-sidebar-material-background"], base.surface);
  const original = buildThemeCssProperties("light", base);
  assert.equal(original["--codex-sidebar-material-background"], base.shellMaterial!.sidebarBackground);
  assert.equal(original["--codex-sidebar-material-filter"], base.shellMaterial!.sidebarFilter);
  const custom = buildThemeCssProperties("light", { ...base, material: { window: "opaque" },
    surfaces: { input: "#121212", popover: "#232323" } });
  assert.equal(custom["--color-background-control"], "#121212");
  assert.equal(custom["--color-background-elevated-primary"], "#232323");
});
