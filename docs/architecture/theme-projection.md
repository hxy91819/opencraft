# Theme projection

The Design System projects one resolved light/dark palette into a fresh complete
semantic CSS map. Theme selection, persistence, extension activation, typography,
layout and native-window appearance remain owned by their existing services.

Inputs retain the existing six palette families, contrast preference, named
surface overrides and window/elevation intent. Six-digit sRGB colors and material
options are validated before use. Overrides affect only their declared roles;
unloading a theme cannot leave keys from the previous projection behind.

The current candidate separates palette/type compatibility data, pure color
operations and role projection. Surface hierarchy and state emphasis use bounded
sRGB mixing. Contrast preference adjusts neutral border emphasis; it does not
change geometry. Primary action text remains readable through hover and pressed
states. Brand accent, neutral keyboard focus, navigation state and semantic
status/badge roles have independent owners. Badge pairs use their panel backing
and reach at least 4.5:1 contrast across custom colors, using the public
[WCAG contrast definition](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Material overrides preserve the existing policy: explicit opaque intent removes
blur/highlights; explicit surface values win only their named slots. Without an
override, built-in Frost/Vela material and the default translucent client material
retain their input values. Composer controls/popovers retain their shared opaque
or 96% surface role rather than inheriting the page behind them.

All existing 97 CSS property names and legacy exports remain compatibility
contracts. Palette configuration data is retained exactly; this is not a claim
that its origin or earlier Git objects have been cleared. The underlying recovered
dynamic contrast/two-mode role catalog has been removed from this candidate.
See [implementation provenance](../../packages/design-system/THEME_PROVENANCE.md)
for its bounded scope, source hashes, prior candidate and verification limits.
