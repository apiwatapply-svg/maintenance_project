import assert from "node:assert/strict";
import test from "node:test";

import { pmStatuses } from "../src/lib/preventiveConfig.js";

test("preventive status config covers every PM workflow state used by the UI", () => {
  assert.deepEqual(Object.keys(pmStatuses), [
    "planned",
    "dueToday",
    "overdue",
    "inProgress",
    "completed",
    "ng",
    "noPlan"
  ]);
});

test("preventive status config provides readable labels and Tailwind tones", () => {
  Object.values(pmStatuses).forEach((status) => {
    assert.equal(typeof status.label, "string");
    assert.ok(status.label.length > 0);
    assert.match(status.tone, /bg-/);
    assert.match(status.tone, /text-/);
    assert.match(status.tone, /ring-/);
  });
});

test("preventive no plan status is available for unmapped machines", () => {
  assert.equal(pmStatuses.noPlan.label, "No Plan");
});
