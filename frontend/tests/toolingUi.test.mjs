import test from "node:test";
import assert from "node:assert/strict";

import {
  buildToolingQuery,
  getToolingApiHeaders,
  getToolingNavItems,
  getToolingPageMeta,
  getToolingPageRange,
  getToolingSessionRedirect,
  toolingFilterStorageKeys
} from "../src/lib/toolingUi.mjs";

test("getToolingNavItems exposes UI-1 pages in order", () => {
  assert.deepEqual(
    getToolingNavItems().map((item) => item.key),
    ["dashboard", "items", "stock"]
  );
  assert.equal(getToolingNavItems()[0].href, "/tooling-store");
});

test("getToolingPageMeta resolves active page details", () => {
  assert.equal(getToolingPageMeta("/tooling-store").title, "Toolling Dashboard");
  assert.equal(getToolingPageMeta("/tooling-store/items").title, "Spare Part Master");
  assert.equal(getToolingPageMeta("/tooling-store/unknown").title, "Toolling Dashboard");
});

test("getToolingSessionRedirect protects Toolling pages without a session", () => {
  assert.equal(getToolingSessionRedirect("/tooling-store", null), "/tooling-store/login");
  assert.equal(
    getToolingSessionRedirect("/tooling-store/stock", { user: { username: "admin" } }),
    null
  );
});

test("getToolingApiHeaders sends the username required by backend permissions", () => {
  assert.deepEqual(getToolingApiHeaders({ user: { username: "admin" } }), {
    "x-username": "admin"
  });
  assert.deepEqual(getToolingApiHeaders(null), {});
});

test("buildToolingQuery removes empty filters and preserves pagination", () => {
  assert.deepEqual(
    buildToolingQuery({
      search: "bearing",
      status: "",
      itemId: null,
      page: 2,
      pageSize: 25
    }),
    { search: "bearing", page: 2, pageSize: 25 }
  );
});

test("getToolingPageRange reports visible result range", () => {
  assert.deepEqual(getToolingPageRange({ page: 2, pageSize: 10, total: 24 }), {
    from: 11,
    to: 20
  });
  assert.deepEqual(getToolingPageRange({ page: 1, pageSize: 10, total: 0 }), {
    from: 0,
    to: 0
  });
});

test("toolingFilterStorageKeys keeps filter state scoped by page", () => {
  assert.equal(toolingFilterStorageKeys.items, "toolingFilters:items");
  assert.equal(toolingFilterStorageKeys.stock, "toolingFilters:stock");
});
