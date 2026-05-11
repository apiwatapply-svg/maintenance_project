import test from "node:test";
import assert from "node:assert/strict";

import { getPaginationPages } from "../src/lib/pagination.mjs";

test("getPaginationPages shows every page when there are seven or fewer pages", () => {
  assert.deepEqual(getPaginationPages(3, 7), [1, 2, 3, 4, 5, 6, 7]);
});

test("getPaginationPages keeps the current page centered with ellipses for long ranges", () => {
  assert.deepEqual(getPaginationPages(6, 12), [1, "ellipsis-left", 4, 5, 6, 7, 8, "ellipsis-right", 12]);
});

test("getPaginationPages clamps out-of-range current pages", () => {
  assert.deepEqual(getPaginationPages(99, 10), [1, "ellipsis-left", 6, 7, 8, 9, 10]);
});
