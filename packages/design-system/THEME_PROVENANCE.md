# Bounded theme projection disposition

The previous `src/theme-engine.ts` explicitly recorded Codex r822 restoration.
Review at base `b8401fad3db985000eb26068d05928ff974273aa` found structural and
formula correspondence in `buildThemeVariant`, the tiered contrast function,
and the light/dark semantic role tables. The exact target and two local reference
hashes are retained in [source bindings](../../docs/provenance/theme-projection-sources.json).
This finding concerns those implementation regions, not every theme palette or
every file covered by the renderer import map.

The replacement uses the previously unintegrated OpenCraft theme candidate whose
public contract was committed at mono2 `722758c7d`. That candidate was re-evaluated
only after bounding the current retained expression; the paused blanket rewrite
proposal is not being used as integration authorization. Its color operations and
semantic projection were authored against OpenCraft inputs/consumer requirements.
The present author has inspected the previous and recovered implementation and
has adjusted the candidate for current material/state contracts: this is **not**
a clean-room process. It is not a mechanical translation or reformatting of the
old tiered-contrast and mode-specific catalog.

`theme-color.ts` provides parsing, bounded color operations and public WCAG
contrast math. `theme-projection.ts` uses a single role map and shared state policy,
with badge/primary text checked against backing colors. `theme-engine.ts` retains
the compatibility entry. `theme-model.ts` retains public types. `theme-presets.ts`
retains existing palette and material input data exactly, including user-selected
Frost/Lavender/Mist/ZenCode/Vela configurations; those data were extracted from the
existing module and are not claimed as new authored expression.

The candidate preserves all 12 preset inputs and 97 CSS property names. Related
behavior tests cover extension unload/reset, material overrides, all palettes,
neutral focus, badge contrast and primary state contrast. Actual browser and build
validation are recorded separately at the tested revision; a candidate or a unit
test is not an integration, publication or native-device claim.

The import-map group remains unverified because the remaining renderer regions,
retained input-data review and historical objects are outside this bounded
disposition. No repository visibility, publication or Join pin changes are made.
