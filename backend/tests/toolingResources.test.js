const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getToolingSeedStatements,
  getToolingSchemaStatements,
  getToolingResource,
  toolingResources,
  normalizeToolingPagination
} = require("../src/config/toolingResources");

test("toolingResources only contains tooling-specific resources and table prefixes", () => {
  assert.equal(toolingResources.categories.table, "tbm_tooling_category");
  assert.equal(toolingResources.locations.table, "tbm_tooling_location");
  assert.equal(toolingResources.units.table, "tbm_tooling_unit");
  assert.equal(toolingResources.tools.table, "tb_tooling_tool");
  assert.equal(toolingResources["stock-items"].table, "tb_tooling_stock_item");
  assert.equal(toolingResources["borrow-issue"].table, "tb_tooling_borrow_transaction");
  assert.equal(toolingResources["stock-in"].table, "tb_tooling_stock_in");
  assert.equal(toolingResources["calibration-list"].table, "tb_tooling_calibration");
});

test("toolingResources does not duplicate admin-owned master data", () => {
  const resourceTables = Object.values(toolingResources).map((resource) => resource.table);

  assert.equal(resourceTables.includes("tbm_user"), false);
  assert.equal(resourceTables.includes("tbm_department"), false);
  assert.equal(resourceTables.includes("tbm_employee"), false);
  assert.equal(resourceTables.includes("tbm_area"), false);
  assert.equal(resourceTables.includes("tbm_machine_type"), false);
  assert.equal(resourceTables.includes("tbm_machine_no"), false);
});

test("getToolingResource returns null for unknown resources", () => {
  assert.equal(getToolingResource("tools").table, "tb_tooling_tool");
  assert.equal(getToolingResource("users"), null);
});

test("transaction resources define backend document number generators", () => {
  assert.deepEqual(getToolingResource("borrow-issue").autoNumber, { column: "issue_no", prefix: "ISS" });
  assert.deepEqual(getToolingResource("return-tool").autoNumber, { column: "return_no", prefix: "RTN" });
  assert.deepEqual(getToolingResource("stock-in").autoNumber, { column: "receive_no", prefix: "SIN" });
  assert.deepEqual(getToolingResource("stock-out").autoNumber, { column: "issue_no", prefix: "SOUT" });
});

test("normalizeToolingPagination clamps values for list endpoints", () => {
  assert.deepEqual(normalizeToolingPagination({ page: "-1", pageSize: "500" }), {
    page: 1,
    pageSize: 100,
    offset: 0
  });
});

test("getToolingSchemaStatements creates required MVP tables without admin duplicates", () => {
  const sqlText = getToolingSchemaStatements().join("\n");

  assert.match(sqlText, /CREATE TABLE dbo\.tbm_tooling_category/);
  assert.match(sqlText, /CREATE TABLE dbo\.tbm_tooling_location/);
  assert.match(sqlText, /CREATE TABLE dbo\.tbm_tooling_unit/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_tool/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_stock_item/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_borrow_transaction/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_return_transaction/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_stock_in/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_stock_out/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_stock_balance/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_movement_history/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_calibration/);
  assert.match(sqlText, /calibration_interval_days INT NOT NULL DEFAULT 180/);
  assert.match(sqlText, /COL_LENGTH\('dbo\.tb_tooling_calibration', 'calibration_interval_days'\)/);
  assert.match(sqlText, /CREATE TABLE dbo\.tb_tooling_report/);
  assert.doesNotMatch(sqlText, /CREATE TABLE dbo\.tbm_user/);
  assert.doesNotMatch(sqlText, /CREATE TABLE dbo\.tbm_department/);
  assert.doesNotMatch(sqlText, /CREATE TABLE dbo\.tbm_employee/);
});

test("tooling seed statements provide initial data for connected pages", () => {
  const seedText = getToolingSeedStatements().join("\n");

  assert.match(seedText, /tb_tooling_borrow_transaction/);
  assert.match(seedText, /tb_tooling_stock_in/);
  assert.match(seedText, /tb_tooling_stock_balance/);
  assert.match(seedText, /tb_tooling_calibration/);
  assert.match(seedText, /calibration_interval_days/);
  assert.match(seedText, /tb_tooling_report/);
});
