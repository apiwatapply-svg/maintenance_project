import test from "node:test";
import assert from "node:assert/strict";

import {
  buildToolingQuery,
  formatToolingBalance,
  getToolingApiHeaders,
  getToolingItemDefaultForm,
  getToolingMovementConfig,
  getToolingNavItems,
  getToolingPageMeta,
  getToolingPageRange,
  getToolingRequestDefaultForm,
  getToolingReturnDefaultForm,
  getToolingSessionRedirect,
  toolingFilterStorageKeys,
  validateToolingItemForm,
  validateToolingMovementForm,
  validateToolingRequestForm,
  validateToolingReturnForm
} from "../src/lib/toolingUi.mjs";

test("getToolingNavItems exposes UI-1 pages in order", () => {
  assert.deepEqual(
    getToolingNavItems().map((item) => item.key),
    ["dashboard", "items", "stock", "stockIn", "stockOut", "requests", "return"]
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

test("getToolingMovementConfig maps movement pages to backend endpoints", () => {
  assert.equal(getToolingMovementConfig("stockIn").endpoint, "/tooling/stock-in");
  assert.equal(getToolingMovementConfig("stockOut").endpoint, "/tooling/stock-out");
  assert.throws(() => getToolingMovementConfig("unknown"), /not found/);
});

test("validateToolingMovementForm requires item, location, and positive quantity", () => {
  assert.deepEqual(validateToolingMovementForm({ itemId: "", locationId: "", quantity: 0 }), {
    itemId: "Item is required.",
    locationId: "Location is required.",
    quantity: "Quantity must be greater than zero."
  });

  assert.deepEqual(
    validateToolingMovementForm({ itemId: 1, locationId: 2, quantity: 3 }),
    {}
  );
});

test("validateToolingMovementForm warns when stock out exceeds current balance", () => {
  assert.deepEqual(
    validateToolingMovementForm(
      { itemId: 1, locationId: 2, quantity: 8 },
      { movementKey: "stockOut", currentBalance: { quantityOnHand: 5 } }
    ),
    { quantity: "Quantity exceeds current balance." }
  );
});

test("getToolingItemDefaultForm provides safe item defaults", () => {
  assert.deepEqual(getToolingItemDefaultForm(), {
    itemCode: "",
    itemName: "",
    categoryId: "",
    itemType: "spare_part",
    unit: "pcs",
    minimumStock: 0,
    maximumStock: 0,
    safetyStock: 0,
    leadTimeDays: 0,
    slowMovementDays: 90,
    deadStockDays: 180,
    minimumOrderQuantity: 1,
    preferredSupplierId: "",
    criticalLevel: "normal",
    locationId: "",
    qrCode: "",
    status: "active"
  });
});

test("validateToolingItemForm requires core item master fields", () => {
  assert.deepEqual(validateToolingItemForm({ itemCode: "", itemName: "", unit: "" }), {
    itemCode: "Item code is required.",
    itemName: "Item name is required.",
    unit: "Unit is required."
  });

  assert.deepEqual(
    validateToolingItemForm({ itemCode: "SP-001", itemName: "Bearing", unit: "pcs" }),
    {}
  );
});

test("formatToolingBalance formats balance with unit and low stock state", () => {
  assert.deepEqual(formatToolingBalance({ quantityOnHand: 4, minimumStock: 5, unit: "pcs" }), {
    label: "4 pcs",
    isLow: true
  });

  assert.deepEqual(formatToolingBalance({ quantityOnHand: 12, minimumStock: 5, unit: "set" }), {
    label: "12 set",
    isLow: false
  });

  assert.deepEqual(formatToolingBalance(null), {
    label: "0",
    isLow: true
  });
});

test("getToolingRequestDefaultForm gives a simple request draft", () => {
  assert.deepEqual(getToolingRequestDefaultForm(), {
    referenceType: "general",
    referenceId: "",
    remark: "",
    items: []
  });
});

test("validateToolingRequestForm requires at least one valid item", () => {
  assert.deepEqual(validateToolingRequestForm({ items: [] }), {
    items: "Add at least one item."
  });

  assert.deepEqual(
    validateToolingRequestForm({
      items: [{ itemId: 1, locationId: 2, quantity: 0 }]
    }),
    { items: "Every item needs item, location, and quantity greater than zero." }
  );

  assert.deepEqual(
    validateToolingRequestForm({
      items: [{ itemId: 1, locationId: 2, quantity: 3 }]
    }),
    {}
  );
});

test("getToolingReturnDefaultForm gives safe return defaults", () => {
  assert.deepEqual(getToolingReturnDefaultForm(), {
    itemId: "",
    locationId: "",
    quantity: "",
    condition: "good",
    referenceNo: "",
    remark: ""
  });
});

test("validateToolingReturnForm requires item, location, quantity, and valid condition", () => {
  assert.deepEqual(validateToolingReturnForm({ condition: "scrap" }), {
    itemId: "Item is required.",
    locationId: "Location is required.",
    quantity: "Quantity must be greater than zero.",
    condition: "Condition must be good, damaged, or lost."
  });

  assert.deepEqual(
    validateToolingReturnForm({ itemId: 1, locationId: 2, quantity: 1, condition: "good" }),
    {}
  );
});
