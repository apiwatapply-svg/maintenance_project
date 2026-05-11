import test from "node:test";
import assert from "node:assert/strict";

import {
  buildToolingScanLookupPath,
  buildToolingQuery,
  buildToolingExcelHtml,
  formatToolingBalance,
  getToolingReportFilterConfig,
  getToolingApiHeaders,
  getToolingItemDefaultForm,
  getToolingMovementConfig,
  getToolingNavItems,
  getToolingPageMeta,
  getToolingPageRange,
  getToolingDashboardBarMax,
  getToolingDashboardDefaultMonth,
  getToolingDashboardPieSegments,
  getToolingDashboardSelectedItems,
  getToolingDashboardTickValues,
  getToolingReferenceOptions,
  getToolingRequestDefaultForm,
  getToolingReturnDefaultForm,
  getToolingRowNumber,
  sanitizeToolingReportFilters,
  getToolingScanFormPatch,
  getToolingSearchMatch,
  getToolingSessionRedirect,
  normalizeToolingScanCode,
  normalizeToolingQuantityInput,
  resolveToolingImageUrl,
  toolingCriticalLevelOptions,
  toolingFilterStorageKeys,
  validateToolingImageFileMeta,
  validateToolingItemForm,
  validateToolingMovementForm,
  validateToolingRequestForm,
  validateToolingReturnForm
} from "../src/lib/toolingUi.mjs";

test("getToolingNavItems exposes UI-1 pages in order", () => {
  assert.deepEqual(
    getToolingNavItems().map((item) => item.key),
    ["dashboard", "items", "stock", "stockIn", "stockOut", "return", "planning", "reports"]
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

test("getToolingReportFilterConfig returns filters appropriate for each report type", () => {
  assert.deepEqual(
    getToolingReportFilterConfig("reorder-suggestion").map((filter) => filter.key),
    ["search", "criticalLevel"]
  );
  assert.deepEqual(
    getToolingReportFilterConfig("movement").map((filter) => filter.key),
    ["search", "movementType"]
  );
  assert.deepEqual(
    getToolingReportFilterConfig("issue-by-job").map((filter) => filter.key),
    ["groupId"]
  );
});

test("buildToolingExcelHtml creates an Excel-compatible bordered table", () => {
  const html = buildToolingExcelHtml({
    title: "movement",
    columns: ["itemCode", "quantity"],
    rows: [{ itemCode: "SP-BRG-6204", quantity: 10 }]
  });

  assert.match(html, /<html/);
  assert.match(html, /border:1px solid #94a3b8/);
  assert.match(html, /mso-number-format/);
  assert.match(html, /SP-BRG-6204/);
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

test("getToolingRowNumber calculates visible row numbers across pages", () => {
  assert.equal(getToolingRowNumber(0, { page: 1, pageSize: 10 }), 1);
  assert.equal(getToolingRowNumber(2, { page: 3, pageSize: 25 }), 53);
});

test("sanitizeToolingReportFilters removes date filters from reports", () => {
  assert.deepEqual(
    sanitizeToolingReportFilters({ dateFrom: "2026-05-01", dateTo: "2026-05-12", page: 2, pageSize: 25 }),
    { page: 2, pageSize: 25 }
  );
});

test("toolingFilterStorageKeys keeps filter state scoped by page", () => {
  assert.equal(toolingFilterStorageKeys.items, "toolingFilters:items");
  assert.equal(toolingFilterStorageKeys.stock, "toolingFilters:stock");
});

test("toolingCriticalLevelOptions matches item form and planning values", () => {
  assert.deepEqual(toolingCriticalLevelOptions, ["", "normal", "important", "critical"]);
});

test("getToolingDashboardDefaultMonth formats the selected month input value", () => {
  assert.equal(getToolingDashboardDefaultMonth(new Date("2026-05-12T08:00:00Z")), "2026-05");
});

test("getToolingDashboardSelectedItems returns drilldown rows for the selected day", () => {
  const chart = {
    itemsByDate: {
      "2026-05-03": [{ itemCode: "SP-001", stockIn: 2, stockOut: 1 }]
    }
  };

  assert.deepEqual(getToolingDashboardSelectedItems(chart, "2026-05-03"), [
    { itemCode: "SP-001", stockIn: 2, stockOut: 1 }
  ]);
  assert.deepEqual(getToolingDashboardSelectedItems(chart, "2026-05-04"), []);
});

test("getToolingDashboardBarMax and pie segments handle empty chart data safely", () => {
  assert.equal(getToolingDashboardBarMax([{ stockIn: 3, stockOut: 9 }]), 9);
  assert.equal(getToolingDashboardBarMax([]), 1);
  assert.deepEqual(getToolingDashboardPieSegments({ stockIn: 3, stockOut: 1 }), [
    { key: "stockIn", label: "Stock In", value: 3, percent: 75, color: "#2563eb" },
    { key: "stockOut", label: "Stock Out", value: 1, percent: 25, color: "#f59e0b" }
  ]);
  assert.deepEqual(getToolingDashboardPieSegments({ stockIn: 0, stockOut: 0 }), []);
});

test("getToolingDashboardTickValues avoids repeated axis labels for small quantities", () => {
  assert.deepEqual(getToolingDashboardTickValues(1), [0, 1]);
  assert.deepEqual(getToolingDashboardTickValues(8), [0, 2, 4, 6, 8]);
});

test("resolveToolingImageUrl maps backend image paths to the API origin", () => {
  assert.equal(
    resolveToolingImageUrl("/images/tooling/bearing-6204.jpg", "http://localhost:5000/api"),
    "http://localhost:5000/images/tooling/bearing-6204.jpg"
  );
  assert.equal(
    resolveToolingImageUrl("https://example.com/bearing.jpg", "http://localhost:5000/api"),
    "https://example.com/bearing.jpg"
  );
  assert.equal(resolveToolingImageUrl("", "http://localhost:5000/api"), "");
});

test("validateToolingImageFileMeta allows only supported item image uploads", () => {
  assert.equal(validateToolingImageFileMeta({ type: "image/png", size: 1000 }), "");
  assert.equal(
    validateToolingImageFileMeta({ type: "text/plain", size: 1000 }),
    "Only jpg, png, and webp images are allowed."
  );
  assert.equal(
    validateToolingImageFileMeta({ type: "image/png", size: 6 * 1024 * 1024 }),
    "Image must be 5 MB or smaller."
  );
});

test("getToolingMovementConfig maps movement pages to backend endpoints", () => {
  assert.equal(getToolingMovementConfig("stockIn").endpoint, "/tooling/stock-in");
  assert.equal(getToolingMovementConfig("stockOut").endpoint, "/tooling/stock-out");
  assert.throws(() => getToolingMovementConfig("unknown"), /not found/);
});

test("normalizeToolingScanCode trims scanner and manual input", () => {
  assert.equal(normalizeToolingScanCode("  SP-001  "), "SP-001");
  assert.equal(normalizeToolingScanCode(null), "");
  assert.equal(normalizeToolingScanCode(undefined), "");
});

test("normalizeToolingQuantityInput keeps only decimal quantity characters", () => {
  assert.equal(normalizeToolingQuantityInput("abc12.5x"), "12.5");
  assert.equal(normalizeToolingQuantityInput("1.2.3"), "1.23");
  assert.equal(normalizeToolingQuantityInput("-5"), "5");
});

test("buildToolingScanLookupPath returns an encoded QR lookup path", () => {
  assert.equal(buildToolingScanLookupPath(" SP/001 A "), "/tooling/items/qr/SP%2F001%20A");
  assert.equal(buildToolingScanLookupPath("   "), "");
});

test("getToolingScanFormPatch selects scanned item and starts quantity at one", () => {
  assert.deepEqual(
    getToolingScanFormPatch(
      { id: 7, locationId: 3 },
      { itemId: 1, locationId: 2, quantity: "8", referenceNo: "PM" }
    ),
    { itemId: 7, locationId: 3, quantity: "1", referenceNo: "PM" }
  );
});

test("getToolingSearchMatch resolves typed or scanned item text", () => {
  const items = [
    { value: 1, itemCode: "S001", itemName: "Sensor", qrCode: "QR-S001", label: "S001 - Sensor" },
    { value: 2, itemCode: "S002", itemName: "Switch", qrCode: "QR-S002", label: "S002 - Switch" }
  ];

  assert.equal(getToolingSearchMatch("S001", items).value, 1);
  assert.equal(getToolingSearchMatch("sensor", items).value, 1);
  assert.equal(getToolingSearchMatch("QR-S002", items).value, 2);
  assert.equal(getToolingSearchMatch("unknown", items), null);
});

test("getToolingReferenceOptions exposes stock movement reference choices", () => {
  assert.deepEqual(
    getToolingReferenceOptions("stockOut").map((option) => option.value),
    ["PM", "JOB", "MACHINE", "ADJ-OUT"]
  );
  assert.deepEqual(
    getToolingReferenceOptions("stockIn").map((option) => option.value),
    ["PO", "INV", "DN", "ADJ-IN"]
  );
});

test("validateToolingMovementForm requires item, location, and positive quantity", () => {
  assert.deepEqual(validateToolingMovementForm({ itemId: "", locationId: "", quantity: 0 }), {
    itemId: "Item is required.",
    locationId: "Location is required.",
    quantity: "Quantity must be a number greater than zero."
  });

  assert.deepEqual(
    validateToolingMovementForm({ itemId: 1, locationId: 2, quantity: 3 }),
    {}
  );

  assert.deepEqual(
    validateToolingMovementForm({ itemId: 1, locationId: 2, quantity: "abc" }),
    { quantity: "Quantity must be a number greater than zero." }
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

test("validateToolingMovementForm uses scanned item balance while stock lookup is loading", () => {
  assert.deepEqual(
    validateToolingMovementForm(
      { itemId: 1, locationId: 2, quantity: 3 },
      { movementKey: "stockOut", selectedItem: { quantityOnHand: 5 } }
    ),
    {}
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
    imageUrl: "",
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
    quantity: "Quantity must be a number greater than zero.",
    condition: "Condition must be good, damaged, or lost."
  });

  assert.deepEqual(
    validateToolingReturnForm({ itemId: 1, locationId: 2, quantity: 1, condition: "good" }),
    {}
  );

  assert.deepEqual(
    validateToolingReturnForm({ itemId: 1, locationId: 2, quantity: "text", condition: "good" }),
    { quantity: "Quantity must be a number greater than zero." }
  );
});
