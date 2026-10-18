import assert from "node:assert/strict";
import test from "node:test";
import { computeDragResizeDimensions } from "../apps/workbench-web/src/browser/browser-viewport-controls";
import { computeBrowserViewportLayout } from "@opencraft/browser-core";
import { readFileSync } from "node:fs";

test("viewport handles map pointer movement to actual dimensions at fit scale",()=>{
  const layout=computeBrowserViewportLayout({x:0,y:0,width:600,height:800},{type:"fit",width:1440,height:900});
  const result=computeDragResizeDimensions({drag:{edge:"bottom-right",startWidth:1440,startHeight:900,startPointerX:0,startPointerY:0},
    pointerX:-20,pointerY:-10,scale:layout.scale,fitWidth:560,fitHeight:780});
  assert.ok(result.width<1440);assert.ok(result.height<900);
  const left=computeDragResizeDimensions({drag:{edge:"left",startWidth:1440,startHeight:900,startPointerX:0,startPointerY:0},
    pointerX:20,pointerY:0,scale:layout.scale,fitWidth:560,fitHeight:780});
  assert.equal(left.width,result.width);assert.equal(left.height,900);
});
test("device UI retains the compact row and edge handles, not the rejected form",()=>{
  const view=readFileSync(new URL("../apps/workbench-web/src/browser/browser-device-toolbar.tsx",import.meta.url),"utf8");
  const panel=readFileSync(new URL("../apps/workbench-web/src/browser/browser-panel-plugin.tsx",import.meta.url),"utf8");
  assert.ok(view.includes("×"));assert.ok(view.includes("Close device toolbar"));
  assert.ok(view.includes('"bottom-left","bottom-right"'));
  assert.doesNotMatch(panel,/拖动调整尺寸|browser-device-controls|宽 <input|高 <input/);
});

test("resize clamps logical dimensions, preserves untouched axes and ignores invalid scale", () => {
  const input = { drag: { edge: "bottom" as const, startWidth: 800, startHeight: 600, startPointerX: 0, startPointerY: 0 },
    pointerX: 900, pointerY: -1000, scale: 1, fitWidth: 1200, fitHeight: 900 };
  assert.deepEqual(computeDragResizeDimensions(input), { width: 800, height: 160 });
  assert.deepEqual(computeDragResizeDimensions({ ...input, scale: 0 }), { width: 800, height: 600 });
  assert.deepEqual(computeDragResizeDimensions({ ...input, pointerY: 10000, fitHeight: 0 }), { width: 800, height: 4096 });
});
