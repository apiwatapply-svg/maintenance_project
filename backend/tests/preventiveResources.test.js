const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getPreventiveSchemaStatements,
  getPreventiveSeedStatements,
  normalizePreventivePagination
} = require("../src/config/preventiveResources");

test("preventive schema uses required PM table prefixes", () => {
  const schema = getPreventiveSchemaStatements().join("\n");

  assert.match(schema, /CREATE TABLE dbo\.tbm_pm_type/);
  assert.match(schema, /CREATE TABLE dbo\.tbm_pm_checklist_item/);
  assert.match(schema, /CREATE TABLE dbo\.tb_pm_machine_mapping/);
  assert.match(schema, /CREATE TABLE dbo\.tb_pm_machine_mapping_type/);
  assert.match(schema, /CREATE TABLE dbo\.tb_pm_plan/);
  assert.match(schema, /CREATE TABLE dbo\.tb_pm_inspection/);
  assert.match(schema, /CREATE TABLE dbo\.tb_pm_inspection_result/);
});

test("preventive schema supports one machine mapped to multiple PM types", () => {
  const schema = getPreventiveSchemaStatements().join("\n");

  assert.match(schema, /tb_pm_machine_mapping_type/);
  assert.match(schema, /mapping_id INT NOT NULL/);
  assert.match(schema, /pm_type_id INT NOT NULL/);
});

test("preventive checklist supports field types required by UI builder", () => {
  const schema = getPreventiveSchemaStatements().join("\n");

  assert.match(schema, /input_type NVARCHAR\(30\) NOT NULL/);
  assert.match(schema, /dropdown_options NVARCHAR\(500\) NULL/);
  assert.match(schema, /min_value DECIMAL\(18,2\) NULL/);
  assert.match(schema, /max_value DECIMAL\(18,2\) NULL/);
  assert.match(schema, /image_url NVARCHAR\(500\) NULL/);
});

test("preventive seed data includes connected UI pages", () => {
  const seed = getPreventiveSeedStatements().join("\n");

  assert.match(seed, /Daily Machine Check/);
  assert.match(seed, /Weekly Lubrication/);
  assert.match(seed, /Monthly Safety Check/);
  assert.match(seed, /CNV-A-001/);
  assert.match(seed, /PM-20260513-001/);
});

test("preventive schema stores UTC timestamps for transaction records", () => {
  const schema = getPreventiveSchemaStatements().join("\n");

  assert.match(schema, /created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME\(\)/);
  assert.match(schema, /updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME\(\)/);
  assert.match(schema, /started_at DATETIME2 NULL/);
  assert.match(schema, /completed_at DATETIME2 NULL/);
});

test("preventive seed data covers all visible PM pages", () => {
  const seed = getPreventiveSeedStatements().join("\n");

  assert.match(seed, /tbm_pm_type/);
  assert.match(seed, /tbm_pm_checklist_item/);
  assert.match(seed, /tb_pm_machine_mapping/);
  assert.match(seed, /tb_pm_machine_mapping_type/);
  assert.match(seed, /tb_pm_plan/);
  assert.match(seed, /tb_pm_inspection/);
});

test("preventive pagination clamps page values", () => {
  assert.deepEqual(normalizePreventivePagination({ page: "-1", pageSize: "999" }), {
    page: 1,
    pageSize: 100,
    offset: 0
  });
});
