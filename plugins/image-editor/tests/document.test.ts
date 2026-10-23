import assert from "node:assert/strict";
import test from "node:test";
import { commitEdit, emptyHistory, selectionRect, stepHistory, type ImageEdit } from "../src/document";

test("each gesture or transform is one undo step; a branch retires redo without changing older history", () => {
  const pen: ImageEdit = { type: "pen", points: [{ x: 20, y: 10 }, { x: 30, y: 15 }], width: 4, color: "red" };
  const drawn = commitEdit(emptyHistory, pen), rotated = commitEdit(drawn, { type: "rotate" });
  const undone = stepHistory(rotated, -1);
  assert.equal(undone.cursor, 1); assert.equal(stepHistory(undone, 1).cursor, 2);
  const branch = commitEdit(undone, { type: "text", point: { x: 8, y: 9 }, text: "hello", size: 20, color: "white" });
  assert.equal(branch.edits.length, 2); assert.equal(branch.edits[1]?.type, "text");
  assert.equal(stepHistory(branch, 1).cursor, 2); assert.equal(rotated.edits[1]?.type, "rotate");
  assert.equal(stepHistory(emptyHistory, -1).cursor, 0);
});

test("crop works for any drag direction and stays expressed in image pixels", () => {
  assert.deepEqual(selectionRect({ x: 800, y: 600 }, { x: 200, y: 100 }), { x: 200, y: 100, width: 600, height: 500 });
});
