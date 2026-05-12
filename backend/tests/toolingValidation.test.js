const assert = require("node:assert/strict");
const test = require("node:test");

const { validateToolingPayload } = require("../src/services/toolingValidationService");
const { calculateCalibrationStatus, getCalibrationStatusRefreshSql, normalizeToolingPayload } = require("../src/repositories/toolingRepository");

test("validateToolingPayload rejects invalid tool status", () => {
  assert.throws(
    () => validateToolingPayload("tools", { tool_code: "TL-001", tool_name: "Torque Wrench", category_code: "MEASURE", location_code: "STORE", status: "Busy" }),
    /Invalid tool status/
  );
});

test("validateToolingPayload rejects negative stock numbers", () => {
  assert.throws(
    () => validateToolingPayload("stock-items", { item_code: "ST-001", item_name: "Bolt", category_code: "FAST", location_code: "A1", unit_code: "PCS", current_stock: -1 }),
    /must not be negative/
  );
});

test("validateToolingPayload rejects invalid numeric text", () => {
  assert.throws(
    () => validateToolingPayload("calibration-list", { tool_code: "TL-001", tool_name: "Torque Wrench", calibration_interval_days: Number.NaN }),
    /calibration_interval_days must be a valid number/
  );
});

test("validateToolingPayload allows valid tooling master payloads", () => {
  assert.deepEqual(
    validateToolingPayload("tools", { tool_code: "TL-001", tool_name: "Torque Wrench", category_code: "MEASURE", location_code: "STORE", status: "Available", minimum_stock: 0 }),
    { ok: true }
  );
});

test("calibration payload calculates next date from interval days", () => {
  assert.deepEqual(
    normalizeToolingPayload("calibration-list", {
      tool_code: "TL-001",
      tool_name: "Torque Wrench",
      last_calibration_date: "2026-05-12",
      calibration_interval_days: 180
    }),
    {
      tool_code: "TL-001",
      tool_name: "Torque Wrench",
      last_calibration_date: "2026-05-12",
      calibration_interval_days: 180,
      next_calibration_date: "2026-11-08",
      status: "Normal"
    }
  );
});

test("calibration payload converts interval string before database binding", () => {
  assert.deepEqual(
    normalizeToolingPayload("calibration-list", {
      tool_code: "TL-001",
      tool_name: "Torque Wrench",
      last_calibration_date: "2026-05-12",
      calibration_interval_days: "180"
    }),
    {
      tool_code: "TL-001",
      tool_name: "Torque Wrench",
      last_calibration_date: "2026-05-12",
      calibration_interval_days: 180,
      next_calibration_date: "2026-11-08",
      status: "Normal"
    }
  );
});

test("calculateCalibrationStatus evaluates expired and due soon dates", () => {
  const today = new Date("2026-05-12T00:00:00.000Z");

  assert.equal(calculateCalibrationStatus("2026-05-11", today), "Expired");
  assert.equal(calculateCalibrationStatus("2026-06-01", today), "Due Soon");
  assert.equal(calculateCalibrationStatus("2026-07-01", today), "Normal");
});

test("calibration list refreshes stored status from next calibration date", () => {
  const sqlText = getCalibrationStatusRefreshSql();

  assert.match(sqlText, /UPDATE dbo\.tb_tooling_calibration/);
  assert.match(sqlText, /DATEDIFF\(DAY, CAST\(SYSUTCDATETIME\(\) AS DATE\), next_calibration_date\) < 0 THEN 'Expired'/);
  assert.match(sqlText, /DATEDIFF\(DAY, CAST\(SYSUTCDATETIME\(\) AS DATE\), next_calibration_date\) <= 30 THEN 'Due Soon'/);
  assert.match(sqlText, /ELSE 'Normal'/);
});
