import assert from "node:assert/strict";
import test from "node:test";
import {
  buildToolingQuery,
  buildToolingMovementRows,
  getDefaultToolingMovementMonth,
  getToolingCalibrationActionFields,
  canShowToolingCalibrationAction,
  getToolingActionLabel,
  getToolingDashboardStorageKey,
  getToolingFilterStorageKey,
  getToolingImagePath,
  getToolingModuleStorageKey,
  getToolingPage,
  getToolingPageNumbers,
  getToolingSidebarStorageKey,
  toolingNavigationGroups,
  toolingPages
} from "../src/lib/toolingResources.js";

test("toolingPages includes MVP pages without admin-owned data pages", () => {
  assert.deepEqual(
    toolingPages.map((page) => page.key),
    [
      "dashboard",
      "master-data",
      "tool-borrowing",
      "spare-part-stock",
      "calibration",
      "history",
      "tools",
      "stock-items",
      "categories",
      "locations",
      "units",
      "borrow-issue",
      "return-tool",
      "overdue-borrow",
      "stock-in",
      "stock-out",
      "stock-balance",
      "movement-history",
      "calibration-list",
      "calibration-due-soon",
      "calibration-expired",
      "reports"
    ]
  );
  assert.equal(toolingPages.some((page) => page.key === "users"), false);
  assert.equal(toolingPages.some((page) => page.key === "employees"), false);
  assert.equal(toolingPages.some((page) => page.key === "departments"), false);
});

test("tooling navigation groups include every sidebar page exactly once", () => {
  const groupedKeys = toolingNavigationGroups.flatMap((group) => group.pages);
  assert.deepEqual([...new Set(groupedKeys)], groupedKeys);
  assert.deepEqual(groupedKeys.sort(), ["calibration", "dashboard", "history", "master-data", "reports", "spare-part-stock", "tool-borrowing"]);
  assert.deepEqual(
    toolingNavigationGroups.map((group) => group.label),
    ["Overview", "Operations", "Reports"]
  );
});

test("module pages group detailed tooling pages as internal tabs", () => {
  assert.deepEqual(getToolingPage("master-data").children, ["tools", "stock-items", "categories", "locations", "units"]);
  assert.deepEqual(getToolingPage("tool-borrowing").children, ["borrow-issue", "return-tool", "overdue-borrow"]);
  assert.deepEqual(getToolingPage("spare-part-stock").children, ["stock-in", "stock-out", "stock-balance"]);
  assert.equal(getToolingModuleStorageKey("master-data"), "toolingModule:master-data");
  assert.equal(getToolingSidebarStorageKey(), "toolingSidebar:expandedGroups");
});

test("operational tooling pages are connected to backend endpoints", () => {
  const connectedPages = toolingPages.filter((page) => page.description && !page.children);

  assert.ok(connectedPages.length > 0);
  connectedPages.forEach((page) => {
    assert.ok(page.endpoint, `${page.key} needs an endpoint`);
    assert.ok(page.columns.length > 0, `${page.key} needs columns`);
    assert.ok(page.fields.length > 0, `${page.key} needs modal fields`);
    assert.ok(page.filters.length > 0, `${page.key} needs filters`);
  });
});

test("stock in and stock out define connected transaction fields", () => {
  const stockIn = getToolingPage("stock-in");
  const stockOut = getToolingPage("stock-out");

  assert.equal(stockIn.endpoint, "stock-in");
  assert.equal(stockOut.endpoint, "stock-out");
  assert.equal(getToolingActionLabel("stock-in"), "Receive Stock");
  assert.equal(getToolingActionLabel("stock-out"), "Issue Stock");
  assert.ok(stockIn.fields.some((field) => field.key === "receive_no" && field.readOnly && field.autoNumber));
  assert.ok(stockOut.fields.some((field) => field.key === "issue_no" && field.readOnly && field.autoNumber));
  assert.ok(stockIn.fields.some((field) => field.key === "item_code" && field.type === "lookup" && field.lookup === "stockItems"));
  assert.ok(stockOut.fields.some((field) => field.key === "item_code" && field.type === "lookup" && field.lookup === "stockItems"));
  assert.ok(stockIn.fields.some((field) => field.key === "quantity" && field.type === "number" && field.defaultValue === 1));
  assert.ok(stockOut.fields.some((field) => field.key === "quantity" && field.type === "number" && field.defaultValue === 1));
  assert.ok(stockOut.fields.some((field) => field.key === "reference_no"));
});

test("tool borrowing pages use operational actions and searchable references", () => {
  const borrowIssue = getToolingPage("borrow-issue");
  const returnTool = getToolingPage("return-tool");

  assert.equal(getToolingActionLabel("borrow-issue"), "Issue Tool");
  assert.equal(getToolingActionLabel("return-tool"), "Return Tool");
  assert.equal(getToolingActionLabel("overdue-borrow"), "");
  assert.ok(borrowIssue.fields.some((field) => field.key === "issue_no" && field.readOnly && field.autoNumber));
  assert.ok(returnTool.fields.some((field) => field.key === "return_no" && field.readOnly && field.autoNumber));
  assert.ok(borrowIssue.fields.some((field) => field.key === "tool_code" && field.type === "lookup" && field.lookup === "tools"));
  assert.ok(returnTool.fields.some((field) => field.key === "issue_no" && field.type === "lookup" && field.lookup === "borrowIssues"));
});

test("calibration pages show interval days and next calibration fields", () => {
  const calibration = getToolingPage("calibration-list");
  const dueSoon = getToolingPage("calibration-due-soon");

  assert.ok(calibration.columns.some((column) => column.key === "calibration_interval_days"));
  assert.ok(calibration.fields.some((field) => field.key === "calibration_interval_days" && field.type === "number" && field.defaultValue === 180));
  assert.ok(dueSoon.columns.some((column) => column.key === "calibration_interval_days"));
});

test("calibration pages define a focused update calibration action", () => {
  assert.deepEqual(getToolingCalibrationActionFields("calibration-list"), [
    "last_calibration_date",
    "calibration_interval_days",
    "next_calibration_date",
    "remark"
  ]);
  assert.deepEqual(getToolingCalibrationActionFields("calibration-due-soon"), [
    "last_calibration_date",
    "calibration_interval_days",
    "next_calibration_date",
    "remark"
  ]);
  assert.deepEqual(getToolingCalibrationActionFields("tools"), []);
  assert.equal(canShowToolingCalibrationAction({ status: "Due Soon" }), true);
  assert.equal(canShowToolingCalibrationAction({ status: "Normal" }), false);
  assert.equal(canShowToolingCalibrationAction({ status: "Expired" }), false);
});

test("master data and borrow pages include contextual images", () => {
  assert.ok(getToolingPage("tools").columns.some((column) => column.key === "image_path" && column.type === "image"));
  assert.ok(getToolingPage("stock-items").fields.some((field) => field.key === "image_path" && field.type === "image"));
  assert.equal(getToolingImagePath({ tool_code: "TL-CV-002", tool_name: "Caliper Vernier" }), "/tooling-images/caliper.svg");
  assert.equal(getToolingImagePath({ item_code: "ST-BRG-6204", item_name: "Bearing 6204 ZZ" }), "/tooling-images/bearing.svg");
  assert.equal(getToolingPage("borrow-request"), null);
  assert.ok(getToolingPage("borrow-issue").fields.some((field) => field.key === "image_path" && field.type === "image"));
  assert.ok(getToolingPage("return-tool").fields.some((field) => field.key === "image_path" && field.type === "image"));
});

test("getToolingPage resolves a page config", () => {
  assert.equal(getToolingPage("tools").endpoint, "tools");
  assert.equal(getToolingPage("missing"), null);
});

test("buildToolingQuery removes empty filters", () => {
  assert.deepEqual(buildToolingQuery({ page: 1, pageSize: 10, search: "", status: "active" }), {
    page: 1,
    pageSize: 10,
    status: "active"
  });
});

test("getToolingFilterStorageKey scopes filters per page", () => {
  assert.equal(getToolingFilterStorageKey("tools"), "toolingFilters:tools");
});

test("dashboard movement month helpers support localStorage and days in month", () => {
  assert.equal(getToolingDashboardStorageKey("movementMonth"), "toolingDashboard:movementMonth");
  assert.equal(getDefaultToolingMovementMonth(new Date("2026-05-12T00:00:00.000Z")), "2026-05");
  assert.equal(buildToolingMovementRows("2026-02").length, 28);
  assert.equal(buildToolingMovementRows("2026-05")[0].day, "01");
  assert.deepEqual(buildToolingMovementRows("2026-05", [{ receive_date: "2026-05-12", quantity: 4 }], [{ issue_date: "2026-05-12", quantity: 2 }])[11], {
    day: "12",
    inQty: 4,
    outQty: 2
  });
});

test("tooling page configs define modal fields and pagination helpers", () => {
  assert.ok(getToolingPage("tools").fields.some((field) => field.key === "category_code" && field.type === "lookup"));
  assert.deepEqual(getToolingPageNumbers(1, 21, 10), [1, 2, 3]);
});
