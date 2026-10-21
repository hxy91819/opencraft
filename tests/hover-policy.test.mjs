import assert from "node:assert/strict";
import test from "node:test";
import { compileString } from "sass";
import { fileURLToPath } from "node:url";
import { inspectHoverStyles, inspectHoverHandlers } from "../scripts/check-hover-policy.mjs";
const styles = source => inspectHoverStyles(source, "fixture.scss");
test("rejects bare and capability-only hover, including nested selectors", () => {
  for (const source of ["a:hover{color:red}", "@media(hover:hover) and (pointer:fine){a:hover{color:red}}", ".a { &:not(:disabled):hover {color:red} }"]) assert.equal(styles(source).length, 1);
});
test("shared guard preserves separate persistent feedback", () => {
  assert.deepEqual(styles('@include controls.hover-capable {a:hover{color:red}} a:focus-visible,a[data-state="open"]{color:red}'), []);
  assert.equal(styles('@include controls.hover-capable {a:hover,a:focus-visible{color:red}}').length, 1);
  assert.equal(styles('@include controls.hover-capable {a:is(:hover,:focus-visible){color:red}}').length, 1);
  assert.deepEqual(styles('@media(any-hover:hover) and (any-pointer:fine){:root:not([data-touch-interaction]) a:hover{color:red}}'), []);
  assert.deepEqual(styles('a:not(:is(:hover,:focus)){color:red}'), []);
});
test("entry handlers distinguish mouse while portal dismissal continuity remains legal", () => {
  assert.equal(inspectHoverHandlers('<button onMouseEnter={() => setOpen(true)}/>', 'fixture.tsx').length, 1);
  assert.equal(inspectHoverHandlers('<button onPointerEnter={() => setOpen(true)}/>', 'fixture.tsx').length, 1);
  assert.deepEqual(inspectHoverHandlers('<button onPointerEnter={event => {if(event.pointerType !== "mouse")return;setOpen(true)}}/>', 'fixture.tsx'), []);
  assert.deepEqual(inspectHoverHandlers('<Menu.Content onMouseEnter={cancelDismiss}/>', 'fixture.tsx'), []);
});


test("input capability imports emit no control or typography CSS", () => {
  const entry = fileURLToPath(new URL("../packages/design-system/src/input.web.scss", import.meta.url)).replaceAll("\\", "/");
  const use = `@use "${entry}" as controls;`;
  assert.equal(compileString(use).css, "", "using input mixins alone must not emit global controls");
  const css = compileString(`${use} .fixture { @include controls.hover-capable { &:hover { color: red; } } @include controls.touch-input { display: block; } }`).css;
  assert.match(css, /any-hover: hover/);
  assert.match(css, /any-pointer: fine/);
  assert.match(css, /:root:not\(\[data-touch-interaction\]\) \.fixture:hover/);
  assert.match(css, /:root\[data-touch-interaction\] \.fixture/);
  assert.doesNotMatch(css, /workbench-|ui-discrete|font-family|@keyframes/);
});
